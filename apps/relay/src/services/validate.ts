import {
  ClientEvent,
  MAX_ENCRYPTED_PAYLOAD_CHARS,
  MAX_MESSAGE_ID_LENGTH,
  MAX_SESSION_ID_LENGTH,
  MAX_WS_MESSAGE_BYTES,
  SESSION_ID_PATTERN,
  isHandleSlug,
  normalizeHandle,
  type ClaimHandleProof,
  type ClientToRelayMessage,
  type EncryptedMessage,
} from '@goprivate/protocol';

export type ParseResult =
  { ok: true; message: ClientToRelayMessage } | { ok: false; code: string; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidSessionId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    id.length >= 16 &&
    id.length <= MAX_SESSION_ID_LENGTH &&
    SESSION_ID_PATTERN.test(id)
  );
}

function isValidEncryptedMessage(value: unknown): value is EncryptedMessage {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    value.id.length > MAX_MESSAGE_ID_LENGTH
  ) {
    return false;
  }
  if (typeof value.encryptedPayload !== 'string') return false;
  if (
    value.encryptedPayload.length === 0 ||
    value.encryptedPayload.length > MAX_ENCRYPTED_PAYLOAD_CHARS
  ) {
    return false;
  }
  if (typeof value.timestamp !== 'number' || !Number.isFinite(value.timestamp)) return false;
  return true;
}

function parseClaimProof(value: unknown): ClaimHandleProof | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.publicKey !== 'string' ||
    value.publicKey.length === 0 ||
    value.publicKey.length > 512
  ) {
    return undefined;
  }
  if (
    typeof value.signature !== 'string' ||
    value.signature.length === 0 ||
    value.signature.length > 512
  ) {
    return undefined;
  }
  if (typeof value.signedAt !== 'number' || !Number.isFinite(value.signedAt)) {
    return undefined;
  }
  return {
    publicKey: value.publicKey,
    signature: value.signature,
    signedAt: value.signedAt,
  };
}

export function parseClientMessage(raw: string): ParseResult {
  if (raw.length > MAX_WS_MESSAGE_BYTES) {
    return { ok: false, code: 'PAYLOAD_TOO_LARGE', message: 'Message exceeds size limit' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, code: 'INVALID_JSON', message: 'Could not parse message' };
  }

  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    return { ok: false, code: 'INVALID_MESSAGE', message: 'Message must include a type' };
  }

  const type = parsed.type;
  const payload = parsed.payload;

  switch (type) {
    case ClientEvent.CREATE_SESSION: {
      if (payload === undefined || payload === null) {
        return { ok: true, message: { type: ClientEvent.CREATE_SESSION } };
      }
      if (!isRecord(payload)) {
        return { ok: false, code: 'INVALID_PAYLOAD', message: 'Invalid CREATE_SESSION payload' };
      }
      if (payload.sessionId !== undefined && !isValidSessionId(payload.sessionId)) {
        return { ok: false, code: 'INVALID_SESSION_ID', message: 'Invalid session id' };
      }
      return {
        ok: true,
        message: {
          type: ClientEvent.CREATE_SESSION,
          payload: payload.sessionId ? { sessionId: payload.sessionId } : {},
        },
      };
    }
    case ClientEvent.JOIN_SESSION: {
      if (!isRecord(payload) || !isValidSessionId(payload.sessionId)) {
        return { ok: false, code: 'INVALID_SESSION_ID', message: 'Invalid session id' };
      }
      return {
        ok: true,
        message: { type: ClientEvent.JOIN_SESSION, payload: { sessionId: payload.sessionId } },
      };
    }
    case ClientEvent.SEND_MESSAGE: {
      if (!isRecord(payload) || !isValidEncryptedMessage(payload.message)) {
        return { ok: false, code: 'INVALID_MESSAGE', message: 'Invalid SEND_MESSAGE payload' };
      }
      return {
        ok: true,
        message: {
          type: ClientEvent.SEND_MESSAGE,
          payload: { message: payload.message },
        },
      };
    }
    case ClientEvent.PING:
      return { ok: true, message: { type: ClientEvent.PING, payload: {} } };
    case ClientEvent.LEAVE_SESSION: {
      // sessionId optional for leave — we key off the socket
      if (payload !== undefined && payload !== null && !isRecord(payload)) {
        return { ok: false, code: 'INVALID_PAYLOAD', message: 'Invalid LEAVE_SESSION payload' };
      }
      const sessionId =
        isRecord(payload) && typeof payload.sessionId === 'string' ? payload.sessionId : '';
      return {
        ok: true,
        message: { type: ClientEvent.LEAVE_SESSION, payload: { sessionId } },
      };
    }
    case ClientEvent.CLAIM_HANDLE: {
      if (
        !isRecord(payload) ||
        typeof payload.handle !== 'string' ||
        !isHandleSlug(payload.handle)
      ) {
        return { ok: false, code: 'HANDLE_INVALID', message: 'Invalid handle' };
      }
      const secret = typeof payload.secret === 'string' ? payload.secret : undefined;
      const proof = parseClaimProof(payload.proof);
      if (payload.proof !== undefined && !proof) {
        return { ok: false, code: 'HANDLE_FORBIDDEN', message: 'Invalid handle proof' };
      }
      return {
        ok: true,
        message: {
          type: ClientEvent.CLAIM_HANDLE,
          payload: {
            handle: normalizeHandle(payload.handle),
            ...(secret ? { secret } : {}),
            ...(proof ? { proof } : {}),
          },
        },
      };
    }
    case ClientEvent.UNCLAIM_HANDLE:
      return { ok: true, message: { type: ClientEvent.UNCLAIM_HANDLE, payload: {} } };
    case ClientEvent.RING_HANDLE: {
      if (
        !isRecord(payload) ||
        typeof payload.handle !== 'string' ||
        !isHandleSlug(payload.handle)
      ) {
        return { ok: false, code: 'HANDLE_INVALID', message: 'Invalid handle' };
      }
      return {
        ok: true,
        message: {
          type: ClientEvent.RING_HANDLE,
          payload: { handle: normalizeHandle(payload.handle) },
        },
      };
    }
    default:
      return { ok: false, code: 'UNKNOWN_EVENT', message: 'Unknown event type' };
  }
}
