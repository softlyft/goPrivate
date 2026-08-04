import type { EncryptedMessage, RelayToClientMessage } from '@goprivate/protocol';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'awaiting_partner'
  | 'handshaking'
  | 'ready'
  | 'error'
  | 'expired';

export interface DecryptedChatMessage {
  id: string;
  text: string;
  timestamp: number;
  fromPeer: boolean;
}

export interface ITransport {
  connect(url: string, options?: { timeoutMs?: number }): Promise<void>;
  send(data: string): void;
  onMessage(handler: (data: string) => void): void;
  onClose(handler: () => void): void;
  onError(handler: (error: Event) => void): void;
  close(): void;
  readonly readyState: number;
}

export interface RelayClientEvents {
  status: (status: ConnectionStatus) => void;
  sessionCreated: (sessionId: string, expiresAt: number) => void;
  partnerJoined: (expiresAt: number) => void;
  partnerLeft: () => void;
  sessionExpired: () => void;
  message: (message: DecryptedChatMessage) => void;
  error: (code: string, message: string) => void;
  raw: (event: RelayToClientMessage) => void;
}

export interface IRelayClient {
  connect(url: string): Promise<void>;
  /** Re-open socket + rejoin current session (mobile background / dropped WS). */
  reconnect(): Promise<void>;
  createSession(sessionId?: string): Promise<string>;
  joinSession(sessionId: string): Promise<void>;
  sendMessage(text: string): Promise<EncryptedMessage>;
  leaveSession(): Promise<void>;
  disconnect(): void;
  on<K extends keyof RelayClientEvents>(event: K, handler: RelayClientEvents[K]): void;
  off<K extends keyof RelayClientEvents>(event: K, handler: RelayClientEvents[K]): void;
  readonly status: ConnectionStatus;
  readonly sessionId: string | null;
  readonly expiresAt: number | null;
  /** True when the underlying WebSocket is OPEN. */
  readonly connected: boolean;
}
