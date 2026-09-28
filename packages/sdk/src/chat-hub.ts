import type {
  ConnectionStatus,
  DecryptedChatMessage,
  IRelayClient,
  RelayClientEvents,
} from './types.js';
import { createRelayClient } from './relay-client.js';

/** Client-side cap on simultaneous 1:1 conversations (matches per-IP create limit). */
export const MAX_CONCURRENT_CHATS = 5;

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
}

type HandlerMap = {
  [K in keyof ChatHubEvents]: Set<ChatHubEvents[K]>;
};

export interface ChatHubOptions {
  createClient?: () => IRelayClient;
  getRelayUrl: () => string;
}

function generateSessionId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
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
export class ChatHub {
  private readonly createClient: () => IRelayClient;
  private readonly getRelayUrl: () => string;
  private readonly clients = new Map<string, IRelayClient>();
  private readonly snapshots = new Map<string, ChatSnapshot>();
  private readonly handlers: HandlerMap = {
    snapshot: new Set(),
    message: new Set(),
    fingerprints: new Set(),
    removed: new Set(),
  };

  constructor(options: ChatHubOptions) {
    this.createClient = options.createClient ?? (() => createRelayClient());
    this.getRelayUrl = options.getRelayUrl;
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
    await client.reconnect();
  }

  async reconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.clients.keys()).map((id) =>
        this.reconnect(id).catch(() => {
          // keep other chats alive
        }),
      ),
    );
  }

  disconnectAll(): void {
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

  private async open(sessionId: string, role: 'host' | 'guest'): Promise<void> {
    const existing = this.clients.get(sessionId);
    if (existing) {
      if (
        existing.status === 'disconnected' ||
        existing.status === 'error' ||
        existing.status === 'connecting'
      ) {
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
      this.patch(sessionId, { status });
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
