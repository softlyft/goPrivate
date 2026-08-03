/** Session lifetime from creation (15 minutes) */
export const SESSION_TTL_MS = 15 * 60 * 1000;

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
