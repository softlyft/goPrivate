import { beforeEach, describe, expect, it } from 'vitest';
import { ChatHub, MAX_CONCURRENT_CHATS } from './chat-hub.js';
import type {
  ConnectionStatus,
  DecryptedChatMessage,
  IRelayClient,
  RelayClientEvents,
} from './types.js';
import type { EncryptedMessage } from '@goprivate/protocol';

type HandlerMap = {
  [K in keyof RelayClientEvents]: Set<RelayClientEvents[K]>;
};

class FakeClient implements IRelayClient {
  status: ConnectionStatus = 'disconnected';
  sessionId: string | null = null;
  expiresAt: number | null = null;
  connected = false;
  createCalls = 0;
  joinCalls = 0;
  reconnectCalls = 0;
  leaveCalls = 0;
  sent: string[] = [];
  private handlers: HandlerMap = {
    status: new Set(),
    sessionCreated: new Set(),
    partnerJoined: new Set(),
    partnerLeft: new Set(),
    sessionExpired: new Set(),
    message: new Set(),
    error: new Set(),
    raw: new Set(),
    fingerprintsReady: new Set(),
  };

  async connect(): Promise<void> {
    this.connected = true;
    this.status = 'connected';
    this.emit('status', this.status);
  }

  async reconnect(): Promise<void> {
    this.reconnectCalls += 1;
    this.connected = true;
    this.status = this.sessionId ? 'awaiting_partner' : 'connected';
    this.emit('status', this.status);
  }

  async createSession(sessionId?: string): Promise<string> {
    this.createCalls += 1;
    this.sessionId = sessionId ?? 'generated-session';
    this.expiresAt = 1_700_000_000_000;
    this.status = 'awaiting_partner';
    this.emit('sessionCreated', this.sessionId, this.expiresAt);
    this.emit('status', this.status);
    return this.sessionId;
  }

  async joinSession(sessionId: string): Promise<void> {
    this.joinCalls += 1;
    this.sessionId = sessionId;
    this.expiresAt = 1_700_000_000_000;
    this.status = 'handshaking';
    this.emit('partnerJoined', this.expiresAt);
    this.emit('status', this.status);
  }

  async sendMessage(text: string): Promise<EncryptedMessage> {
    const message: EncryptedMessage = {
      id: `m-${this.sent.length}`,
      encryptedPayload: 'x',
      timestamp: Date.now(),
    };
    this.sent.push(text);
    this.emit('message', {
      id: message.id,
      text,
      timestamp: message.timestamp,
      fromPeer: false,
    });
    return message;
  }

  async leaveSession(): Promise<void> {
    this.leaveCalls += 1;
    this.disconnect();
  }

  disconnect(): void {
    this.connected = false;
    this.status = 'disconnected';
    this.emit('status', this.status);
  }

  on<K extends keyof RelayClientEvents>(event: K, handler: RelayClientEvents[K]): void {
    this.handlers[event].add(handler);
  }

  off<K extends keyof RelayClientEvents>(event: K, handler: RelayClientEvents[K]): void {
    this.handlers[event].delete(handler);
  }

  async getLocalFingerprint(): Promise<string | null> {
    return null;
  }

  async getPeerFingerprint(): Promise<string | null> {
    return null;
  }

  emit<K extends keyof RelayClientEvents>(
    event: K,
    ...args: Parameters<RelayClientEvents[K]>
  ): void {
    for (const handler of this.handlers[event]) {
      (handler as (...handlerArgs: Parameters<RelayClientEvents[K]>) => void)(...args);
    }
  }
}

describe('ChatHub', () => {
  let clients: FakeClient[];
  let hub: ChatHub;

  beforeEach(() => {
    clients = [];
    hub = new ChatHub({
      getRelayUrl: () => 'ws://relay/ws',
      createClient: () => {
        const client = new FakeClient();
        clients.push(client);
        return client;
      },
    });
  });

  it('keeps a separate client per 1:1 session', async () => {
    const a = await hub.createSession('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const b = await hub.createSession('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');

    expect(a).not.toBe(b);
    expect(hub.size).toBe(2);
    expect(clients).toHaveLength(2);
    expect(clients[0]?.createCalls).toBe(1);
    expect(clients[1]?.createCalls).toBe(1);
    expect(clients[0]?.sessionId).toBe(a);
    expect(clients[1]?.sessionId).toBe(b);
  });

  it('does not recreate an already-open session', async () => {
    const id = await hub.createSession('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    await hub.createSession(id);
    expect(clients).toHaveLength(1);
    expect(clients[0]?.createCalls).toBe(1);
  });

  it('routes sendMessage and inbound events to the owning session', async () => {
    const a = await hub.createSession('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const b = await hub.createSession('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');

    const received: { sessionId: string; text: string }[] = [];
    hub.on('message', (sessionId, message: DecryptedChatMessage) => {
      received.push({ sessionId, text: message.text });
    });

    await hub.sendMessage(a, 'from-a');
    clients[1]?.emit('message', {
      id: 'peer',
      text: 'from-b-peer',
      timestamp: 1,
      fromPeer: true,
    });

    expect(received).toEqual([
      { sessionId: a, text: 'from-a' },
      { sessionId: b, text: 'from-b-peer' },
    ]);
  });

  it('leaveSession only drops that conversation', async () => {
    const a = await hub.createSession('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const b = await hub.createSession('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');

    await hub.leaveSession(a);

    expect(hub.has(a)).toBe(false);
    expect(hub.has(b)).toBe(true);
    expect(hub.size).toBe(1);
    expect(clients[0]?.leaveCalls).toBe(1);
    expect(clients[1]?.leaveCalls).toBe(0);
  });

  it('rejects more than MAX_CONCURRENT_CHATS live conversations', async () => {
    for (let i = 0; i < MAX_CONCURRENT_CHATS; i++) {
      await hub.createSession(`${i}`.padStart(32, 'a'));
    }
    await expect(hub.createSession('ffffffffffffffffffffffffffffffff')).rejects.toThrow(
      /at most 5 conversations/,
    );
    expect(hub.size).toBe(MAX_CONCURRENT_CHATS);
  });

  it('joinSession uses a guest client without touching other chats', async () => {
    const hosted = await hub.createSession('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    await hub.joinSession('cccccccccccccccccccccccccccccccc');

    expect(hub.size).toBe(2);
    expect(clients[0]?.joinCalls).toBe(0);
    expect(clients[1]?.joinCalls).toBe(1);
    expect(hub.get(hosted)?.isHost).toBe(true);
    expect(hub.get('cccccccccccccccccccccccccccccccc')?.partnerPresent).toBe(true);
  });
});
