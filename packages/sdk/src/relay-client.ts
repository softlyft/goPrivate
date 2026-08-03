import { createCryptoProvider, type ICryptoProvider, type KeyPair } from '@goprivate/crypto';
import {
  AppMessageKind,
  ClientEvent,
  RelayEvent,
  type AppPlaintext,
  type ClientToRelayMessage,
  type EncryptedMessage,
  type PublicKeyHandshake,
  type RelayToClientMessage,
} from '@goprivate/protocol';
import type {
  ConnectionStatus,
  DecryptedChatMessage,
  IRelayClient,
  ITransport,
  RelayClientEvents,
} from './types.js';
import { WebSocketTransport } from './transport.js';

type HandlerMap = {
  [K in keyof RelayClientEvents]: Set<RelayClientEvents[K]>;
};

function createId(): string {
  return globalThis.crypto.randomUUID();
}

function generateSessionId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export class RelayClient implements IRelayClient {
  private transport: ITransport;
  private crypto: ICryptoProvider;
  private _status: ConnectionStatus = 'disconnected';
  private _sessionId: string | null = null;
  private _expiresAt: number | null = null;
  private keyPair: KeyPair | null = null;
  private sharedKey: CryptoKey | null = null;
  private peerPublicKeyReceived = false;
  private localPublicKeySent = false;
  private handlers: HandlerMap = {
    status: new Set(),
    sessionCreated: new Set(),
    partnerJoined: new Set(),
    partnerLeft: new Set(),
    sessionExpired: new Set(),
    message: new Set(),
    error: new Set(),
    raw: new Set(),
  };

  constructor(options?: { transport?: ITransport; crypto?: ICryptoProvider }) {
    this.transport = options?.transport ?? new WebSocketTransport();
    this.crypto = options?.crypto ?? createCryptoProvider();
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  get sessionId(): string | null {
    return this._sessionId;
  }

  get expiresAt(): number | null {
    return this._expiresAt;
  }

  on<K extends keyof RelayClientEvents>(event: K, handler: RelayClientEvents[K]): void {
    this.handlers[event].add(handler);
  }

  off<K extends keyof RelayClientEvents>(event: K, handler: RelayClientEvents[K]): void {
    this.handlers[event].delete(handler);
  }

  private emit<K extends keyof RelayClientEvents>(
    event: K,
    ...args: Parameters<RelayClientEvents[K]>
  ): void {
    for (const handler of this.handlers[event]) {
      (handler as (...a: Parameters<RelayClientEvents[K]>) => void)(...args);
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status;
    this.emit('status', status);
  }

  async connect(url: string): Promise<void> {
    this.setStatus('connecting');
    this.transport.onMessage((data) => this.handleRawMessage(data));
    this.transport.onClose(() => {
      if (this._status !== 'expired') {
        this.setStatus('disconnected');
      }
      this.resetCryptoState();
    });
    await this.transport.connect(url);
    this.setStatus('connected');
  }

  async createSession(sessionId?: string): Promise<string> {
    const id = sessionId ?? generateSessionId();
    this._sessionId = id;
    this.keyPair = await this.crypto.generateKeyPair();

    const created = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off('sessionCreated', onCreated);
        this.off('error', onError);
        reject(new Error('Timed out creating session'));
      }, 5000);

      const onCreated = (createdId: string) => {
        clearTimeout(timer);
        this.off('sessionCreated', onCreated);
        this.off('error', onError);
        resolve(createdId);
      };

      const onError = (code: string, message: string) => {
        clearTimeout(timer);
        this.off('sessionCreated', onCreated);
        this.off('error', onError);
        reject(new Error(`${code}: ${message}`));
      };

      this.on('sessionCreated', onCreated);
      this.on('error', onError);
    });

    this.send({ type: ClientEvent.CREATE_SESSION, payload: { sessionId: id } });
    return created;
  }

  async joinSession(sessionId: string): Promise<void> {
    if (
      this._sessionId === sessionId &&
      this._status !== 'disconnected' &&
      this._status !== 'error' &&
      this._status !== 'expired'
    ) {
      return;
    }
    this._sessionId = sessionId;
    this.keyPair = await this.crypto.generateKeyPair();
    this.send({ type: ClientEvent.JOIN_SESSION, payload: { sessionId } });
  }

  async sendMessage(text: string): Promise<EncryptedMessage> {
    if (!this.sharedKey) {
      throw new Error('Secure channel is not ready');
    }

    const plaintext: AppPlaintext = { kind: AppMessageKind.CHAT, text };
    const encryptedPayload = await this.crypto.encrypt(JSON.stringify(plaintext), this.sharedKey);
    const message: EncryptedMessage = {
      id: createId(),
      encryptedPayload,
      timestamp: Date.now(),
    };

    this.send({ type: ClientEvent.SEND_MESSAGE, payload: { message } });
    this.emit('message', {
      id: message.id,
      text,
      timestamp: message.timestamp,
      fromPeer: false,
    });
    return message;
  }

  async leaveSession(): Promise<void> {
    if (this._sessionId) {
      try {
        this.send({
          type: ClientEvent.LEAVE_SESSION,
          payload: { sessionId: this._sessionId },
        });
      } catch {
        // Socket may already be closed
      }
    }
    this.disconnect();
  }

  disconnect(): void {
    this.transport.close();
    this.resetCryptoState();
    this._sessionId = null;
    this._expiresAt = null;
    if (this._status !== 'expired') {
      this.setStatus('disconnected');
    }
  }

  private resetCryptoState(): void {
    this.keyPair = null;
    this.sharedKey = null;
    this.peerPublicKeyReceived = false;
    this.localPublicKeySent = false;
  }

  private send(message: ClientToRelayMessage): void {
    this.transport.send(JSON.stringify(message));
  }

  private handleRawMessage(data: string): void {
    let event: RelayToClientMessage;
    try {
      event = JSON.parse(data) as RelayToClientMessage;
    } catch {
      this.emit('error', 'PARSE_ERROR', 'Invalid message from relay');
      return;
    }

    this.emit('raw', event);
    void this.handleEvent(event);
  }

  private async handleEvent(event: RelayToClientMessage): Promise<void> {
    switch (event.type) {
      case RelayEvent.SESSION_CREATED:
        this._sessionId = event.payload.sessionId;
        this._expiresAt = event.payload.expiresAt;
        this.emit('sessionCreated', event.payload.sessionId, event.payload.expiresAt);
        this.setStatus('awaiting_partner');
        break;

      case RelayEvent.PARTNER_JOINED:
        this._expiresAt = event.payload.expiresAt;
        this.emit('partnerJoined', event.payload.expiresAt);
        this.setStatus('handshaking');
        await this.sendPublicKey();
        break;

      case RelayEvent.MESSAGE:
        await this.handleIncomingMessage(event.payload.message);
        break;

      case RelayEvent.PARTNER_LEFT:
        this.emit('partnerLeft');
        this.sharedKey = null;
        this.peerPublicKeyReceived = false;
        this.localPublicKeySent = false;
        this.setStatus('awaiting_partner');
        break;

      case RelayEvent.SESSION_EXPIRED:
        this._expiresAt = null;
        this.emit('sessionExpired');
        this.setStatus('expired');
        this.resetCryptoState();
        break;

      case RelayEvent.ERROR:
        this.emit('error', event.payload.code, event.payload.message);
        if (event.payload.code === 'SESSION_EXPIRED') {
          this.setStatus('expired');
        } else {
          this.setStatus('error');
        }
        break;

      case RelayEvent.PONG:
        break;
    }
  }

  private async sendPublicKey(): Promise<void> {
    if (!this.keyPair || this.localPublicKeySent) return;

    const publicKey = await this.crypto.exportPublicKey(this.keyPair.publicKey);
    const handshake: PublicKeyHandshake = {
      kind: AppMessageKind.PUBLIC_KEY,
      publicKey,
    };

    const message: EncryptedMessage = {
      id: createId(),
      encryptedPayload: JSON.stringify(handshake),
      timestamp: Date.now(),
    };

    this.send({ type: ClientEvent.SEND_MESSAGE, payload: { message } });
    this.localPublicKeySent = true;
  }

  private async handleIncomingMessage(message: EncryptedMessage): Promise<void> {
    try {
      const parsed = JSON.parse(message.encryptedPayload) as AppPlaintext;
      if (parsed.kind === AppMessageKind.PUBLIC_KEY) {
        await this.handlePeerPublicKey(parsed.publicKey);
        return;
      }
    } catch {
      // Not JSON — treat as encrypted chat ciphertext
    }

    if (!this.sharedKey) {
      this.emit('error', 'NOT_READY', 'Received encrypted message before handshake completed');
      return;
    }

    try {
      const decrypted = await this.crypto.decrypt(message.encryptedPayload, this.sharedKey);
      const plaintext = JSON.parse(decrypted) as AppPlaintext;
      if (plaintext.kind !== AppMessageKind.CHAT) {
        return;
      }

      const chatMessage: DecryptedChatMessage = {
        id: message.id,
        text: plaintext.text,
        timestamp: message.timestamp,
        fromPeer: true,
      };
      this.emit('message', chatMessage);
    } catch {
      this.emit('error', 'DECRYPT_FAILED', 'Failed to decrypt message');
    }
  }

  private async handlePeerPublicKey(peerPublicKeyBase64: string): Promise<void> {
    if (!this.keyPair || this.peerPublicKeyReceived) return;

    const peerPublicKey = await this.crypto.importPublicKey(peerPublicKeyBase64);
    this.sharedKey = await this.crypto.deriveSharedSecret(this.keyPair.privateKey, peerPublicKey);
    this.peerPublicKeyReceived = true;

    if (!this.localPublicKeySent) {
      await this.sendPublicKey();
    }

    this.setStatus('ready');
  }
}

export function createRelayClient(options?: {
  transport?: ITransport;
  crypto?: ICryptoProvider;
}): IRelayClient {
  return new RelayClient(options);
}
