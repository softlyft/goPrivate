import { MAX_CONCURRENT_CHATS } from '@goprivate/config';
import {
  ClientEvent,
  RelayEvent,
  type ClaimHandleProof,
  type RelayToClientMessage,
} from '@goprivate/protocol';
import type {
  ConnectionStatus,
  DecryptedChatMessage,
  IRelayClient,
  ITransport,
  RelayClientEvents,
} from './types.js';
import { createRelayClient } from './relay-client.js';
import { WebSocketTransport } from './transport.js';

export { MAX_CONCURRENT_CHATS };

export interface ChatSnapshot {
  sessionId: string;
  isHost: boolean;
  status: ConnectionStatus;
  expiresAt: number | null;
  partnerPresent: boolean;
  error: string | null;
}

export interface ChatHubEvents {
  snapshot: (sessionId: string, snapshot: ChatSnapshot) => void;
  message: (sessionId: string, message: DecryptedChatMessage) => void;
  fingerprints: (sessionId: string, local: string, peer: string) => void;
  removed: (sessionId: string) => void;
  incomingRing: (sessionId: string, handle: string) => void;
  handleStatus: (handle: string | null) => void;
}

type HandlerMap = {
  [K in keyof ChatHubEvents]: Set<ChatHubEvents[K]>;
};

export interface ChatHubOptions {
  createClient?: () => IRelayClient;
  createTransport?: () => ITransport;
  getRelayUrl: () => string;
  getClaimSecret?: () => string | undefined;
  getHandleProof?: (handle: string) => Promise<ClaimHandleProof | null | undefined>;
}

function generateSessionId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function isLiveStatus(status: ConnectionStatus): boolean {
  return (
    status === 'connecting' ||
    status === 'connected' ||
    status === 'awaiting_partner' ||
    status === 'handshaking' ||
    status === 'ready'
  );
}

function emptySnapshot(sessionId: string, isHost: boolean): ChatSnapshot {
  return {
    sessionId,
    isHost,
    status: 'connecting',
    expiresAt: null,
    partnerPresent: false,
    error: null,
  };
}

/**
 * One RelayClient (one WebSocket) per 1:1 session so several chats can stay live.
 */
const MAILBOX_PING_MS = 20_000;
const MAILBOX_RPC_TIMEOUT_MS = 45_000;

export class ChatHub {
  private readonly createClient: () => IRelayClient;
  private readonly createTransport: () => ITransport;
  private readonly getRelayUrl: () => string;
  private readonly getClaimSecret?: () => string | undefined;
  private readonly getHandleProof?: (
    handle: string,
  ) => Promise<ClaimHandleProof | null | undefined>;
  private readonly clients = new Map<string, IRelayClient>();
  private readonly snapshots = new Map<string, ChatSnapshot>();
  private readonly opening = new Map<string, Promise<void>>();
  private mailbox: ITransport | null = null;
  private mailboxPing: ReturnType<typeof setInterval> | null = null;
  private claimedHandle: string | null = null;
  private desiredHandle: string | null = null;
  private claimInFlight: Promise<string> | null = null;
  private pendingClaim: {
    handle: string;
    resolve: (handle: string) => void;
    reject: (error: Error) => void;
  } | null = null;
  private readonly handlers: HandlerMap = {
    snapshot: new Set(),
    message: new Set(),
    fingerprints: new Set(),
    removed: new Set(),
    incomingRing: new Set(),
    handleStatus: new Set(),
  };

  constructor(options: ChatHubOptions) {
    this.createClient = options.createClient ?? (() => createRelayClient());
    this.createTransport = options.createTransport ?? (() => new WebSocketTransport());
    this.getRelayUrl = options.getRelayUrl;
    this.getClaimSecret = options.getClaimSecret;
    this.getHandleProof = options.getHandleProof;
  }

  get handle(): string | null {
    return this.claimedHandle;
  }

  get size(): number {
    return this.clients.size;
  }

  has(sessionId: string): boolean {
    return this.clients.has(sessionId);
  }

  list(): ChatSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  get(sessionId: string): ChatSnapshot | undefined {
    return this.snapshots.get(sessionId);
  }

  getClient(sessionId: string): IRelayClient | undefined {
    return this.clients.get(sessionId);
  }

  on<K extends keyof ChatHubEvents>(event: K, handler: ChatHubEvents[K]): void {
    this.handlers[event].add(handler);
  }

  off<K extends keyof ChatHubEvents>(event: K, handler: ChatHubEvents[K]): void {
    this.handlers[event].delete(handler);
  }

  async createSession(sessionId?: string): Promise<string> {
    const id = sessionId ?? generateSessionId();
    await this.open(id, 'host');
    return id;
  }

  async joinSession(sessionId: string): Promise<void> {
    await this.open(sessionId, 'guest');
  }

  async ringHandle(handle: string): Promise<string> {
    if (this.clients.size >= MAX_CONCURRENT_CHATS) {
      throw new Error(`You can have at most ${MAX_CONCURRENT_CHATS} conversations at once`);
    }
    const client = this.createClient();
    try {
      if (
        client.status === 'disconnected' ||
        client.status === 'error' ||
        client.status === 'expired'
      ) {
        await client.connect(this.getRelayUrl());
      }
      const sessionId = await client.ringHandle(handle);
      this.clients.set(sessionId, client);
      this.patch(sessionId, {
        ...emptySnapshot(sessionId, true),
        status: client.status,
        expiresAt: client.expiresAt,
      });
      this.attach(sessionId, client);
      return sessionId;
    } catch (err) {
      try {
        client.disconnect();
      } catch {
        // ignore
      }
      throw err;
    }
  }

  async claimHandle(handle: string): Promise<string> {
    this.desiredHandle = handle;
    if (this.claimInFlight) {
      return this.claimInFlight;
    }
    this.claimInFlight = this.claimHandleNow(handle).finally(() => {
      this.claimInFlight = null;
    });
    return this.claimInFlight;
  }

  async unclaimHandle(): Promise<void> {
    const transport = this.mailbox;
    this.desiredHandle = null;
    this.claimedHandle = null;
    this.emit('handleStatus', null);
    if (!transport) return;
    try {
      transport.send(JSON.stringify({ type: ClientEvent.UNCLAIM_HANDLE, payload: {} }));
    } catch {
      // ignore
    }
    this.closeMailbox();
  }

  async sendMessage(sessionId: string, text: string): Promise<void> {
    await this.requireClient(sessionId).sendMessage(text);
  }

  async leaveSession(sessionId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    if (client) {
      try {
        await client.leaveSession();
      } catch {
        try {
          client.disconnect();
        } catch {
          // already closed
        }
      }
    }
    this.drop(sessionId);
  }

  async reconnect(sessionId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;
    if (client.status === 'expired') return;
    // Status stays live until onclose; readyState can flap while the relay
    // still counts this socket, so never JOIN a conversation that is already up.
    if (isLiveStatus(client.status)) return;
    await client.reconnect();
  }

  async reconnectAll(): Promise<void> {
    await Promise.all([
      this.reclaimHandle().catch(() => {
        // mailbox is best-effort
      }),
      ...Array.from(this.clients.keys()).map((id) =>
        this.reconnect(id).catch(() => {
          // keep other chats alive
        }),
      ),
    ]);
  }

  disconnectAll(): void {
    void this.unclaimHandle();
    for (const id of Array.from(this.clients.keys())) {
      const client = this.clients.get(id);
      try {
        client?.disconnect();
      } catch {
        // ignore
      }
      this.drop(id);
    }
  }

  private async claimHandleNow(handle: string): Promise<string> {
    await this.ensureMailbox();
    const transport = this.mailbox;
    if (!transport) {
      throw new Error('Mailbox is not connected');
    }

    const secret = this.getClaimSecret?.();
    const proof = await this.getHandleProof?.(handle);
    const claimed = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingClaim?.handle === handle) {
          this.pendingClaim = null;
        }
        reject(new Error('Timed out claiming handle'));
      }, MAILBOX_RPC_TIMEOUT_MS);
      this.pendingClaim = {
        handle,
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
    });

    transport.send(
      JSON.stringify({
        type: ClientEvent.CLAIM_HANDLE,
        payload: {
          handle,
          ...(secret ? { secret } : {}),
          ...(proof ? { proof } : {}),
        },
      }),
    );
    return claimed;
  }

  private async ensureMailbox(): Promise<void> {
    if (this.mailbox && this.mailbox.readyState === 1) return;
    this.closeMailbox();
    const transport = this.createTransport();
    this.mailbox = transport;
    transport.onMessage((data) => this.handleMailboxMessage(data));
    transport.onClose(() => {
      if (this.mailbox !== transport) return;
      this.mailbox = null;
      this.stopMailboxPing();
      if (this.claimedHandle) {
        this.claimedHandle = null;
        this.emit('handleStatus', null);
      }
    });
    transport.onError(() => {
      // close handler will run
    });
    await transport.connect(this.getRelayUrl());
    this.startMailboxPing();
  }

  private handleMailboxMessage(data: string): void {
    let event: RelayToClientMessage;
    try {
      event = JSON.parse(data) as RelayToClientMessage;
    } catch {
      return;
    }

    if (event.type === RelayEvent.HANDLE_CLAIMED) {
      this.claimedHandle = event.payload.handle;
      this.pendingClaim?.resolve(event.payload.handle);
      this.pendingClaim = null;
      this.emit('handleStatus', event.payload.handle);
      return;
    }

    if (event.type === RelayEvent.ERROR) {
      const error = new Error(`${event.payload.code}: ${event.payload.message}`);
      this.pendingClaim?.reject(error);
      this.pendingClaim = null;
      return;
    }

    if (event.type === RelayEvent.INCOMING_RING) {
      const { sessionId, handle } = event.payload;
      this.emit('incomingRing', sessionId, handle);
      void this.joinSession(sessionId).catch(() => {
        // inbox join is best-effort; visitor still waits in the session
      });
    }
  }

  private async reclaimHandle(): Promise<void> {
    if (!this.desiredHandle) return;
    await this.claimHandleNow(this.desiredHandle);
  }

  private startMailboxPing(): void {
    this.stopMailboxPing();
    this.mailboxPing = setInterval(() => {
      try {
        this.mailbox?.send(JSON.stringify({ type: ClientEvent.PING, payload: {} }));
      } catch {
        this.closeMailbox();
      }
    }, MAILBOX_PING_MS);
  }

  private stopMailboxPing(): void {
    if (this.mailboxPing) {
      clearInterval(this.mailboxPing);
      this.mailboxPing = null;
    }
  }

  private closeMailbox(): void {
    this.stopMailboxPing();
    const transport = this.mailbox;
    this.mailbox = null;
    try {
      transport?.close();
    } catch {
      // ignore
    }
  }

  private async open(sessionId: string, role: 'host' | 'guest'): Promise<void> {
    const inFlight = this.opening.get(sessionId);
    if (inFlight) {
      await inFlight;
      if (this.clients.has(sessionId)) return;
    }

    const run = this.openNow(sessionId, role);
    this.opening.set(sessionId, run);
    try {
      await run;
    } finally {
      if (this.opening.get(sessionId) === run) {
        this.opening.delete(sessionId);
      }
    }
  }

  private async openNow(sessionId: string, role: 'host' | 'guest'): Promise<void> {
    const existing = this.clients.get(sessionId);
    if (existing) {
      if (existing.status !== 'expired' && !isLiveStatus(existing.status)) {
        await existing.reconnect();
      }
      return;
    }

    if (this.clients.size >= MAX_CONCURRENT_CHATS) {
      throw new Error(`You can have at most ${MAX_CONCURRENT_CHATS} conversations at once`);
    }

    const client = this.createClient();
    this.clients.set(sessionId, client);
    this.patch(sessionId, emptySnapshot(sessionId, role === 'host'));
    this.attach(sessionId, client);

    try {
      if (
        client.status === 'disconnected' ||
        client.status === 'error' ||
        client.status === 'expired'
      ) {
        await client.connect(this.getRelayUrl());
      }
      if (role === 'host') {
        await client.createSession(sessionId);
      } else {
        await client.joinSession(sessionId);
      }
    } catch (err) {
      try {
        client.disconnect();
      } catch {
        // ignore
      }
      this.drop(sessionId);
      throw err;
    }
  }

  private attach(sessionId: string, client: IRelayClient): void {
    const onStatus: RelayClientEvents['status'] = (status) => {
      this.patch(sessionId, {
        status,
        ...(isLiveStatus(status) ? { error: null } : {}),
      });
    };
    const onCreated: RelayClientEvents['sessionCreated'] = (_id, expiresAt) => {
      this.patch(sessionId, { isHost: true, expiresAt, error: null });
    };
    const onJoined: RelayClientEvents['partnerJoined'] = (expiresAt) => {
      this.patch(sessionId, { partnerPresent: true, expiresAt, error: null });
    };
    const onLeft: RelayClientEvents['partnerLeft'] = () => {
      this.patch(sessionId, { partnerPresent: false });
    };
    const onExpired: RelayClientEvents['sessionExpired'] = () => {
      this.patch(sessionId, { status: 'expired', expiresAt: null });
    };
    const onMessage: RelayClientEvents['message'] = (message) => {
      this.emit('message', sessionId, message);
    };
    const onError: RelayClientEvents['error'] = (code, message) => {
      if (code === 'SESSION_NOT_FOUND') return;
      this.patch(sessionId, { error: message });
      if (code === 'SESSION_EXPIRED') {
        this.patch(sessionId, { status: 'expired', expiresAt: null });
      }
    };
    const onFingerprints: RelayClientEvents['fingerprintsReady'] = (local, peer) => {
      this.emit('fingerprints', sessionId, local, peer);
    };

    client.on('status', onStatus);
    client.on('sessionCreated', onCreated);
    client.on('partnerJoined', onJoined);
    client.on('partnerLeft', onLeft);
    client.on('sessionExpired', onExpired);
    client.on('message', onMessage);
    client.on('error', onError);
    client.on('fingerprintsReady', onFingerprints);
  }

  private requireClient(sessionId: string): IRelayClient {
    const client = this.clients.get(sessionId);
    if (!client) {
      throw new Error('That conversation is not connected');
    }
    return client;
  }

  private patch(sessionId: string, partial: Partial<ChatSnapshot>): void {
    const prev = this.snapshots.get(sessionId) ?? emptySnapshot(sessionId, false);
    const next: ChatSnapshot = { ...prev, ...partial, sessionId };
    this.snapshots.set(sessionId, next);
    this.emit('snapshot', sessionId, next);
  }

  private drop(sessionId: string): void {
    this.clients.delete(sessionId);
    this.snapshots.delete(sessionId);
    this.emit('removed', sessionId);
  }

  private emit<K extends keyof ChatHubEvents>(
    event: K,
    ...args: Parameters<ChatHubEvents[K]>
  ): void {
    for (const handler of this.handlers[event]) {
      (handler as (...handlerArgs: Parameters<ChatHubEvents[K]>) => void)(...args);
    }
  }
}

export function createChatHub(options: ChatHubOptions): ChatHub {
  return new ChatHub(options);
}
