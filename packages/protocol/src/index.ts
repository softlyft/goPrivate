/** Session lifetime from creation (15 minutes) */
export const SESSION_TTL_MS = 15 * 60 * 1000;

/** Keep empty sessions briefly so mobile app-switch can reconnect. */
export const RECONNECT_GRACE_MS = 60_000;

/** Max UTF-16 length of chat plaintext before encryption. */
export const MAX_CHAT_TEXT_CHARS = 4_000;

/** Max length of opaque encryptedPayload string on the wire. */
export const MAX_ENCRYPTED_PAYLOAD_CHARS = 24_000;

/** Max WebSocket text frame size (bytes) accepted by the relay. */
export const MAX_WS_MESSAGE_BYTES = 64_000;

/** Max concurrent sessions in the in-memory relay store. */
export const MAX_RELAY_SESSIONS = 500;

/** Max concurrent WebSocket connections on the relay. */
export const MAX_RELAY_CONNECTIONS = 1_000;

/** Max CREATE/JOIN/SEND actions per IP per sliding window. */
export const RATE_LIMIT_MAX_ACTIONS = 60;
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Session IDs: hex from clients (32 chars) or uuid-like. */
export const SESSION_ID_PATTERN = /^[a-f0-9]{16,64}$/i;
export const MAX_SESSION_ID_LENGTH = 64;

/** Max length of encrypted message id (uuid). */
export const MAX_MESSAGE_ID_LENGTH = 80;

/** Client → Relay event types */
export const ClientEvent = {
  CREATE_SESSION: 'CREATE_SESSION',
  JOIN_SESSION: 'JOIN_SESSION',
  SEND_MESSAGE: 'SEND_MESSAGE',
  PING: 'PING',
  LEAVE_SESSION: 'LEAVE_SESSION',
} as const;

export type ClientEventType = (typeof ClientEvent)[keyof typeof ClientEvent];

/** Relay → Client event types */
export const RelayEvent = {
  SESSION_CREATED: 'SESSION_CREATED',
  PARTNER_JOINED: 'PARTNER_JOINED',
  MESSAGE: 'MESSAGE',
  PARTNER_LEFT: 'PARTNER_LEFT',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  ERROR: 'ERROR',
  PONG: 'PONG',
} as const;

export type RelayEventType = (typeof RelayEvent)[keyof typeof RelayEvent];

/** Opaque encrypted message as seen by the relay */
export interface EncryptedMessage {
  id: string;
  encryptedPayload: string;
  timestamp: number;
}

export interface CreateSessionPayload {
  sessionId?: string;
}

export interface JoinSessionPayload {
  sessionId: string;
}

export interface SendMessagePayload {
  message: EncryptedMessage;
}

export interface LeaveSessionPayload {
  sessionId: string;
}

export type ClientToRelayMessage =
  | { type: typeof ClientEvent.CREATE_SESSION; payload?: CreateSessionPayload }
  | { type: typeof ClientEvent.JOIN_SESSION; payload: JoinSessionPayload }
  | { type: typeof ClientEvent.SEND_MESSAGE; payload: SendMessagePayload }
  | { type: typeof ClientEvent.PING; payload?: Record<string, never> }
  | { type: typeof ClientEvent.LEAVE_SESSION; payload: LeaveSessionPayload };

export interface SessionCreatedPayload {
  sessionId: string;
  expiresAt: number;
}

export interface PartnerJoinedPayload {
  sessionId: string;
  participantCount: number;
  expiresAt: number;
}

export interface MessagePayload {
  message: EncryptedMessage;
}

export interface PartnerLeftPayload {
  sessionId: string;
}

export interface SessionExpiredPayload {
  sessionId: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export type RelayToClientMessage =
  | { type: typeof RelayEvent.SESSION_CREATED; payload: SessionCreatedPayload }
  | { type: typeof RelayEvent.PARTNER_JOINED; payload: PartnerJoinedPayload }
  | { type: typeof RelayEvent.MESSAGE; payload: MessagePayload }
  | { type: typeof RelayEvent.PARTNER_LEFT; payload: PartnerLeftPayload }
  | { type: typeof RelayEvent.SESSION_EXPIRED; payload: SessionExpiredPayload }
  | { type: typeof RelayEvent.ERROR; payload: ErrorPayload }
  | { type: typeof RelayEvent.PONG; payload?: Record<string, never> };

/** Application-level payload kinds carried inside encryptedPayload after encryption */
export const AppMessageKind = {
  PUBLIC_KEY: 'PUBLIC_KEY',
  CHAT: 'CHAT',
} as const;

export type AppMessageKindType = (typeof AppMessageKind)[keyof typeof AppMessageKind];

export interface PublicKeyHandshake {
  kind: typeof AppMessageKind.PUBLIC_KEY;
  publicKey: string;
}

export interface ChatPlaintext {
  kind: typeof AppMessageKind.CHAT;
  text: string;
}

export type AppPlaintext = PublicKeyHandshake | ChatPlaintext;
