import { AppMessageKind, ClientEvent, MAX_CHAT_TEXT_CHARS, RelayEvent } from '@goprivate/protocol';
import { createCryptoProvider } from '@goprivate/crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRelayClient, RelayClient } from './relay-client.js';
import type { ITransport } from './types.js';

class MockTransport implements ITransport {
  readyState = 1;
  sent: string[] = [];
  private messageHandler: ((data: string) => void) | null = null;
  private closeHandler: (() => void) | null = null;

  async connect(): Promise<void> {
    this.readyState = 1;
  }

  send(data: string): void {
    if (this.readyState !== 1) throw new Error('Transport is not connected');
    this.sent.push(data);
  }

  onMessage(handler: (data: string) => void): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  onError(): void {}

  close(): void {
    this.readyState = 3;
    this.closeHandler?.();
  }

  emitJson(data: unknown): void {
    this.messageHandler?.(JSON.stringify(data));
  }

  emitRaw(data: string): void {
    this.messageHandler?.(data);
  }

  lastSent(): { type: string; payload?: Record<string, unknown> } {
    const raw = this.sent.at(-1);
    if (!raw) throw new Error('nothing sent');
    return JSON.parse(raw) as { type: string; payload?: Record<string, unknown> };
  }
}

async function waitForClientEvent(transport: MockTransport, type: string): Promise<void> {
  await vi.waitFor(() => {
    expect(transport.sent.some((raw) => JSON.parse(raw).type === type)).toBe(true);
  });
}

describe('RelayClient', () => {
  let transport: MockTransport;
  let client: RelayClient;

  beforeEach(() => {
    transport = new MockTransport();
    client = new RelayClient({ transport });
  });

  it('connects and reports connected status', async () => {
    const statuses: string[] = [];
    client.on('status', (s) => statuses.push(s));
    await client.connect('ws://relay/ws');
    expect(client.status).toBe('connected');
    expect(client.connected).toBe(true);
    expect(statuses).toEqual(expect.arrayContaining(['connecting', 'connected']));
  });

  it('creates a session and waits for SESSION_CREATED', async () => {
    await client.connect('ws://relay/ws');
    const pending = client.createSession('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    await waitForClientEvent(transport, ClientEvent.CREATE_SESSION);
    transport.emitJson({
      type: RelayEvent.SESSION_CREATED,
      payload: { sessionId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', expiresAt: Date.now() + 60_000 },
    });
    const id = await pending;
    expect(id).toBe('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(client.isHost).toBe(true);
    expect(client.status).toBe('awaiting_partner');
    expect(transport.lastSent().type).toBe(ClientEvent.CREATE_SESSION);
  });

  it('completes ECDH handshake after join', async () => {
    await client.connect('ws://relay/ws');
    const pending = client.joinSession('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    await waitForClientEvent(transport, ClientEvent.JOIN_SESSION);
    transport.emitJson({
      type: RelayEvent.PARTNER_JOINED,
      payload: {
        sessionId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        participantCount: 2,
        expiresAt: Date.now() + 60_000,
      },
    });
    await pending;
    expect(client.status).toBe('handshaking');

    const crypto = createCryptoProvider();
    const peer = await crypto.generateKeyPair();
    const peerPub = await crypto.exportPublicKey(peer.publicKey);

    transport.emitJson({
      type: RelayEvent.MESSAGE,
      payload: {
        message: {
          id: 'pk1',
          encryptedPayload: JSON.stringify({ kind: AppMessageKind.PUBLIC_KEY, publicKey: peerPub }),
          timestamp: Date.now(),
        },
      },
    });

    await vi.waitFor(() => expect(client.status).toBe('ready'));

    const chat = await client.sendMessage('hi');
    expect(chat.id).toBeTruthy();
    expect(transport.lastSent().type).toBe(ClientEvent.SEND_MESSAGE);
  });

  it('rejects oversized chat text once ready', async () => {
    await client.connect('ws://relay/ws');
    const pending = client.joinSession('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
    await waitForClientEvent(transport, ClientEvent.JOIN_SESSION);
    transport.emitJson({
      type: RelayEvent.PARTNER_JOINED,
      payload: {
        sessionId: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        participantCount: 2,
        expiresAt: Date.now() + 60_000,
      },
    });
    await pending;

    const crypto = createCryptoProvider();
    const peer = await crypto.generateKeyPair();
    transport.emitJson({
      type: RelayEvent.MESSAGE,
      payload: {
        message: {
          id: 'pk2',
          encryptedPayload: JSON.stringify({
            kind: AppMessageKind.PUBLIC_KEY,
            publicKey: await crypto.exportPublicKey(peer.publicKey),
          }),
          timestamp: Date.now(),
        },
      },
    });
    await vi.waitFor(() => expect(client.status).toBe('ready'));

    await expect(client.sendMessage('x'.repeat(MAX_CHAT_TEXT_CHARS + 1))).rejects.toThrow(
      /too long/i,
    );
  });

  it('preserves session id after unexpected close', async () => {
    await client.connect('ws://relay/ws');
    const pending = client.createSession('cccccccccccccccccccccccccccccccc');
    await waitForClientEvent(transport, ClientEvent.CREATE_SESSION);
    transport.emitJson({
      type: RelayEvent.SESSION_CREATED,
      payload: { sessionId: 'cccccccccccccccccccccccccccccccc', expiresAt: Date.now() + 1000 },
    });
    await pending;
    transport.close();
    expect(client.status).toBe('disconnected');
    expect(client.sessionId).toBe('cccccccccccccccccccccccccccccccc');
  });

  it('leaveSession clears session', async () => {
    await client.connect('ws://relay/ws');
    const pending = client.createSession('dddddddddddddddddddddddddddddddd');
    await waitForClientEvent(transport, ClientEvent.CREATE_SESSION);
    transport.emitJson({
      type: RelayEvent.SESSION_CREATED,
      payload: { sessionId: 'dddddddddddddddddddddddddddddddd', expiresAt: Date.now() + 1000 },
    });
    await pending;
    await client.leaveSession();
    expect(client.sessionId).toBeNull();
    expect(client.status).toBe('disconnected');
  });

  it('emits parse errors for invalid relay JSON', async () => {
    await client.connect('ws://relay/ws');
    const errors: string[] = [];
    client.on('error', (code) => errors.push(code));
    transport.emitRaw('not-json');
    expect(errors).toContain('PARSE_ERROR');
  });

  it('handles partner left and session expired events', async () => {
    await client.connect('ws://relay/ws');
    let partnerLeft = false;
    client.on('partnerLeft', () => {
      partnerLeft = true;
    });
    transport.emitJson({ type: RelayEvent.PARTNER_LEFT, payload: { sessionId: 'x' } });
    expect(partnerLeft).toBe(true);
    expect(client.status).toBe('awaiting_partner');

    transport.emitJson({
      type: RelayEvent.SESSION_EXPIRED,
      payload: { sessionId: 'x' },
    });
    expect(client.status).toBe('expired');
  });

  it('createRelayClient factory and auto session id work', async () => {
    const built = createRelayClient({ transport });
    await built.connect('ws://relay/ws');
    const pending = built.createSession();
    await waitForClientEvent(transport, ClientEvent.CREATE_SESSION);
    const sentId = transport.lastSent().payload?.sessionId as string;
    transport.emitJson({
      type: RelayEvent.SESSION_CREATED,
      payload: { sessionId: sentId, expiresAt: Date.now() + 1000 },
    });
    await expect(pending).resolves.toBe(sentId);
  });

  it('handles relay errors, pong, and decrypt paths', async () => {
    await client.connect('ws://relay/ws');
    transport.emitJson({ type: RelayEvent.PONG, payload: {} });

    transport.emitJson({
      type: RelayEvent.ERROR,
      payload: { code: 'SESSION_NOT_FOUND', message: 'gone' },
    });
    expect(client.status).toBe('connected');

    transport.emitJson({
      type: RelayEvent.ERROR,
      payload: { code: 'SESSION_EXPIRED', message: 'expired' },
    });
    expect(client.status).toBe('expired');

    transport.emitJson({
      type: RelayEvent.ERROR,
      payload: { code: 'OTHER', message: 'boom' },
    });
    expect(client.status).toBe('error');
  });

  it('reconnects into an existing session and decrypts peer chat', async () => {
    await client.connect('ws://relay/ws');
    const sessionId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1';
    const pending = client.createSession(sessionId);
    await waitForClientEvent(transport, ClientEvent.CREATE_SESSION);
    transport.emitJson({
      type: RelayEvent.SESSION_CREATED,
      payload: { sessionId, expiresAt: Date.now() + 60_000 },
    });
    await pending;

    transport.close();
    expect(client.sessionId).toBe(sessionId);

    const reconnecting = client.reconnect();
    await waitForClientEvent(transport, ClientEvent.JOIN_SESSION);
    transport.emitJson({
      type: RelayEvent.PARTNER_JOINED,
      payload: {
        sessionId,
        participantCount: 2,
        expiresAt: Date.now() + 60_000,
      },
    });
    await reconnecting;

    const crypto = createCryptoProvider();
    const peer = await crypto.generateKeyPair();
    transport.emitJson({
      type: RelayEvent.MESSAGE,
      payload: {
        message: {
          id: 'pk3',
          encryptedPayload: JSON.stringify({
            kind: AppMessageKind.PUBLIC_KEY,
            publicKey: await crypto.exportPublicKey(peer.publicKey),
          }),
          timestamp: Date.now(),
        },
      },
    });
    await vi.waitFor(() => expect(client.status).toBe('ready'));

    // Peer encrypts a chat with the derived shared secret using client's public key from wire
    const pkSend = transport.sent
      .map((raw) => JSON.parse(raw))
      .find(
        (m) =>
          m.type === ClientEvent.SEND_MESSAGE &&
          typeof m.payload?.message?.encryptedPayload === 'string',
      );
    const handshake = JSON.parse(pkSend.payload.message.encryptedPayload) as {
      publicKey: string;
    };
    const clientPub = await crypto.importPublicKey(handshake.publicKey);
    const shared = await crypto.deriveSharedSecret(peer.privateKey, clientPub);
    const cipher = await crypto.encrypt(
      JSON.stringify({ kind: AppMessageKind.CHAT, text: 'secret' }),
      shared,
    );

    const messages: { text: string }[] = [];
    client.on('message', (m) => messages.push(m));
    transport.emitJson({
      type: RelayEvent.MESSAGE,
      payload: {
        message: { id: 'c1', encryptedPayload: cipher, timestamp: Date.now() },
      },
    });
    await vi.waitFor(() => expect(messages.some((m) => m.text === 'secret')).toBe(true));

    transport.emitJson({
      type: RelayEvent.MESSAGE,
      payload: {
        message: { id: 'bad', encryptedPayload: 'not-valid-cipher', timestamp: Date.now() },
      },
    });
  });

  it('rejects reconnect without prior session and emits not-ready', async () => {
    await expect(client.reconnect()).rejects.toThrow(/nothing to reconnect/i);
    await client.connect('ws://relay/ws');
    const errors: string[] = [];
    client.on('error', (code) => errors.push(code));
    transport.emitJson({
      type: RelayEvent.MESSAGE,
      payload: {
        message: { id: 'early', encryptedPayload: 'ciphertext', timestamp: Date.now() },
      },
    });
    await vi.waitFor(() => expect(errors).toContain('NOT_READY'));
  });

  it('supports off() for event handlers', async () => {
    await client.connect('ws://relay/ws');
    const errors: string[] = [];
    const handler = (code: string) => errors.push(code);
    client.on('error', handler);
    client.off('error', handler);
    transport.emitRaw('bad');
    expect(errors).toEqual([]);
  });
});
