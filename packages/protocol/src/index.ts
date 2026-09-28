/** Session lifetime from creation */
export {
  SESSION_TTL_MS,
  RECONNECT_GRACE_MS,
  MAX_RELAY_SESSIONS,
  MAX_RELAY_CONNECTIONS,
  RATE_LIMIT_MAX_ACTIONS,
  RATE_LIMIT_WINDOW_MS,
} from '@goprivate/config';

/** Max UTF-16 length of chat plaintext before encryption. */
export const MAX_CHAT_TEXT_CHARS = 4_000;

/** Max length of opaque encryptedPayload string on the wire. */
export const MAX_ENCRYPTED_PAYLOAD_CHARS = 24_000;

/** Max WebSocket text frame size (bytes) accepted by the relay. */
export const MAX_WS_MESSAGE_BYTES = 64_000;

/** Session IDs: hex from clients (32 chars) or uuid-like. */
export const SESSION_ID_PATTERN = /^[a-f0-9]{16,64}$/i;
export const MAX_SESSION_ID_LENGTH = 64;

export { HANDLE_PATTERN, isHandleSlug, isAllowedHandle, normalizeHandle } from '@goprivate/config';

/** Max length of encrypted message id (uuid). */
export const MAX_MESSAGE_ID_LENGTH = 80;

/** Client → Relay event types */
export const ClientEvent = {
  CREATE_SESSION: 'CREATE_SESSION',
  JOIN_SESSION: 'JOIN_SESSION',
  SEND_MESSAGE: 'SEND_MESSAGE',
  PING: 'PING',
  LEAVE_SESSION: 'LEAVE_SESSION',
  CLAIM_HANDLE: 'CLAIM_HANDLE',
  UNCLAIM_HANDLE: 'UNCLAIM_HANDLE',
  RING_HANDLE: 'RING_HANDLE',
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
  HANDLE_CLAIMED: 'HANDLE_CLAIMED',
  INCOMING_RING: 'INCOMING_RING',
  RING_READY: 'RING_READY',
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

export interface ClaimHandleProof {
  publicKey: string;
  signedAt: number;
  signature: string;
}

export interface ClaimHandlePayload {
  handle: string;
  secret?: string;
  proof?: ClaimHandleProof;
}

/** Canonical bytes the lease key signs when claiming a handle. */
export function handleClaimMessage(handle: string, signedAt: number): string {
  return `goprivate:claim:${handle}:${signedAt}`;
}

export interface RingHandlePayload {
  handle: string;
}

export type ClientToRelayMessage =
  | { type: typeof ClientEvent.CREATE_SESSION; payload?: CreateSessionPayload }
  | { type: typeof ClientEvent.JOIN_SESSION; payload: JoinSessionPayload }
  | { type: typeof ClientEvent.SEND_MESSAGE; payload: SendMessagePayload }
  | { type: typeof ClientEvent.PING; payload?: Record<string, never> }
  | { type: typeof ClientEvent.LEAVE_SESSION; payload: LeaveSessionPayload }
  | { type: typeof ClientEvent.CLAIM_HANDLE; payload: ClaimHandlePayload }
  | { type: typeof ClientEvent.UNCLAIM_HANDLE; payload?: Record<string, never> }
  | { type: typeof ClientEvent.RING_HANDLE; payload: RingHandlePayload };

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

export interface HandleClaimedPayload {
  handle: string;
}

export interface IncomingRingPayload {
  sessionId: string;
  handle: string;
  expiresAt: number;
}

export interface RingReadyPayload {
  sessionId: string;
  expiresAt: number;
}

export type RelayToClientMessage =
  | { type: typeof RelayEvent.SESSION_CREATED; payload: SessionCreatedPayload }
  | { type: typeof RelayEvent.PARTNER_JOINED; payload: PartnerJoinedPayload }
  | { type: typeof RelayEvent.MESSAGE; payload: MessagePayload }
  | { type: typeof RelayEvent.PARTNER_LEFT; payload: PartnerLeftPayload }
  | { type: typeof RelayEvent.SESSION_EXPIRED; payload: SessionExpiredPayload }
  | { type: typeof RelayEvent.ERROR; payload: ErrorPayload }
  | { type: typeof RelayEvent.PONG; payload?: Record<string, never> }
  | { type: typeof RelayEvent.HANDLE_CLAIMED; payload: HandleClaimedPayload }
  | { type: typeof RelayEvent.INCOMING_RING; payload: IncomingRingPayload }
  | { type: typeof RelayEvent.RING_READY; payload: RingReadyPayload };

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
