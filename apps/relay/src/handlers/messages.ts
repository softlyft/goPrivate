import { timingSafeEqual } from 'node:crypto';
import type { WebSocket } from '@fastify/websocket';
import { HANDLE_ALLOWLIST, MAX_CONCURRENT_CHATS, isAllowedHandle } from '@goprivate/config';
import {
  ClientEvent,
  MAX_RELAY_SESSIONS,
  RECONNECT_GRACE_MS,
  RelayEvent,
  type ClaimHandleProof,
} from '@goprivate/protocol';
import { InMemoryHandleStore, type IHandleStore } from '../session/handles.js';
import type { ISessionStore, Participant, Session } from '../session/store.js';
import { allowAction, canCreateSession, canCreateSessionFromIP } from '../services/limits.js';
import { broadcast, sendToSocket } from '../services/messenger.js';
import { parseClientMessage } from '../services/validate.js';
import {
  type HandleLease,
  type HandleRegistry,
  verifyHandleLeaseProof,
} from '../services/handle-registry.js';

export interface MessageHandlerOptions {
  claimSecret?: string;
  allowlist?: readonly string[];
  getRegistry?: () => HandleRegistry;
}

function secretsEqual(provided: string | undefined, expected: string): boolean {
  const left = Buffer.from(provided ?? '');
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    timingSafeEqual(right, right);
    return false;
  }
  return timingSafeEqual(left, right);
}

// Helper to obfuscate IP for logging (GDPR-friendly)
function obfuscateIP(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return 'xxx.xxx.xxx.xxx';
}

// Helper to obfuscate session ID for logging
function obfuscateSessionId(id: string): string {
  if (id.length <= 8) return '****';
  return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
}

// Logger instance (passed from index.ts ideally, but we'll use console for now)
const logger = console;

function createParticipantId(): string {
  return crypto.randomUUID();
}

export function createMessageHandler(
  store: ISessionStore,
  handles: IHandleStore = new InMemoryHandleStore(),
  options: MessageHandlerOptions = {},
) {
  const allowlist = options.allowlist ?? HANDLE_ALLOWLIST;
  const claimAllowed = (handle: string): boolean => {
    if (allowlist.length === 0) return isAllowedHandle(handle);
    return allowlist.includes(handle);
  };

  return function handleMessage(socket: WebSocket, raw: string, ip = 'unknown'): void {
    const parsed = parseClientMessage(raw);
    if (!parsed.ok) {
      sendToSocket(socket, {
        type: RelayEvent.ERROR,
        payload: { code: parsed.code, message: parsed.message },
      });
      return;
    }

    const message = parsed.message;

    try {
      switch (message.type) {
        case ClientEvent.CREATE_SESSION:
          if (!allowAction(ip, 'create')) {
            logger.warn({
              event: 'rate_limit_exceeded',
              action: 'create',
              ip: obfuscateIP(ip),
            });
            sendToSocket(socket, {
              type: RelayEvent.ERROR,
              payload: { code: 'RATE_LIMITED', message: 'Too many session creates' },
            });
            return;
          }
          if (!canCreateSessionFromIP(ip)) {
            logger.warn({
              event: 'per_ip_session_limit_exceeded',
              ip: obfuscateIP(ip),
            });
            sendToSocket(socket, {
              type: RelayEvent.ERROR,
              payload: {
                code: 'RATE_LIMITED',
                message: 'Too many sessions from your IP. Try again later.',
              },
            });
            return;
          }
          handleCreateSession(store, handles, socket, message.payload?.sessionId, ip);
          break;
        case ClientEvent.JOIN_SESSION:
          if (!allowAction(ip, 'join')) {
            logger.warn({
              event: 'rate_limit_exceeded',
              action: 'join',
              ip: obfuscateIP(ip),
            });
            sendToSocket(socket, {
              type: RelayEvent.ERROR,
              payload: { code: 'RATE_LIMITED', message: 'Too many join attempts' },
            });
            return;
          }
          handleJoinSession(store, handles, socket, message.payload.sessionId, ip);
          break;
        case ClientEvent.SEND_MESSAGE:
          if (!allowAction(ip, 'send')) {
            logger.warn({
              event: 'rate_limit_exceeded',
              action: 'send',
              ip: obfuscateIP(ip),
            });
            sendToSocket(socket, {
              type: RelayEvent.ERROR,
              payload: { code: 'RATE_LIMITED', message: 'Too many messages' },
            });
            return;
          }
          handleSendMessage(store, socket, message.payload.message, handles);
          break;
        case ClientEvent.PING:
          sendToSocket(socket, { type: RelayEvent.PONG, payload: {} });
          break;
        case ClientEvent.LEAVE_SESSION:
          handleLeave(store, handles, socket);
          break;
        case ClientEvent.CLAIM_HANDLE:
          if (!allowAction(ip, 'claim')) {
            sendToSocket(socket, {
              type: RelayEvent.ERROR,
              payload: { code: 'RATE_LIMITED', message: 'Too many handle claims' },
            });
            return;
          }
          handleClaimHandle(
            store,
            handles,
            socket,
            message.payload.handle,
            message.payload.secret,
            message.payload.proof,
            {
              claimSecret: options.claimSecret,
              claimAllowed,
              getLease: (name) => options.getRegistry?.()[name],
            },
          );
          break;
        case ClientEvent.UNCLAIM_HANDLE:
          handles.releaseBySocket(socket);
          break;
        case ClientEvent.RING_HANDLE:
          if (!allowAction(ip, 'ring')) {
            sendToSocket(socket, {
              type: RelayEvent.ERROR,
              payload: { code: 'RATE_LIMITED', message: 'Too many handle rings' },
            });
            return;
          }
          if (!canCreateSessionFromIP(ip)) {
            sendToSocket(socket, {
              type: RelayEvent.ERROR,
              payload: {
                code: 'RATE_LIMITED',
                message: 'Too many sessions from your IP. Try again later.',
              },
            });
            return;
          }
          handleRingHandle(store, handles, socket, message.payload.handle, ip);
          break;
        default:
          sendToSocket(socket, {
            type: RelayEvent.ERROR,
            payload: { code: 'UNKNOWN_EVENT', message: 'Unknown event type' },
          });
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unexpected error';
      sendToSocket(socket, {
        type: RelayEvent.ERROR,
        payload: { code: 'INTERNAL_ERROR', message: detail },
      });
    }
  };
}

function expireIfNeeded(store: ISessionStore, session: Session, handles?: IHandleStore): boolean {
  if (!store.isExpired(session)) return false;
  expireSession(store, session, handles);
  return true;
}

export function expireSession(
  store: ISessionStore,
  session: Session,
  handles?: IHandleStore,
): void {
  cancelPendingDestroy(session.id);
  const sockets = session.participants.map((p) => p.socket);
  broadcast(sockets, {
    type: RelayEvent.SESSION_EXPIRED,
    payload: { sessionId: session.id },
  });
  store.destroy(session.id);
  handles?.dropInbound(session.id);
  for (const socket of sockets) {
    try {
      socket.close();
    } catch {
      // ignore
    }
  }
}

export function sweepExpiredSessions(store: ISessionStore, handles?: IHandleStore): number {
  const expired = store.getExpired();
  for (const session of expired) {
    expireSession(store, session, handles);
  }
  return expired.length;
}

function rejectIfBusy(store: ISessionStore, handles: IHandleStore, socket: WebSocket): boolean {
  if (store.findBySocket(socket) || handles.getBySocket(socket)) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: { code: 'ALREADY_IN_SESSION', message: 'Socket already in a session' },
    });
    return true;
  }
  return false;
}

function handleClaimHandle(
  store: ISessionStore,
  handles: IHandleStore,
  socket: WebSocket,
  handle: string,
  secret: string | undefined,
  proof: ClaimHandleProof | undefined,
  options: {
    claimSecret?: string;
    claimAllowed: (handle: string) => boolean;
    getLease?: (handle: string) => HandleLease | undefined;
  },
): void {
  if (store.findBySocket(socket)) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: { code: 'ALREADY_IN_SESSION', message: 'Socket already in a session' },
    });
    return;
  }

  const lease = options.getLease?.(handle);
  if (lease) {
    if (!proof) {
      sendToSocket(socket, {
        type: RelayEvent.ERROR,
        payload: {
          code: 'HANDLE_FORBIDDEN',
          message: 'This name is reserved. Paste the lease key from your operator.',
        },
      });
      return;
    }
    const result = verifyHandleLeaseProof(lease, handle, proof);
    if (result !== 'ok') {
      sendToSocket(socket, {
        type: RelayEvent.ERROR,
        payload: {
          code: result,
          message:
            result === 'HANDLE_EXPIRED'
              ? 'This name lease has expired. Ask the operator for a new key.'
              : 'This device is not the current owner of that name.',
        },
      });
      return;
    }
  } else {
    if (!options.claimAllowed(handle)) {
      sendToSocket(socket, {
        type: RelayEvent.ERROR,
        payload: {
          code: 'HANDLE_FORBIDDEN',
          message: 'This handle is not available on this relay',
        },
      });
      return;
    }
    if (options.claimSecret && !secretsEqual(secret, options.claimSecret)) {
      sendToSocket(socket, {
        type: RelayEvent.ERROR,
        payload: { code: 'HANDLE_FORBIDDEN', message: 'Handle claim was rejected' },
      });
      return;
    }
  }
  try {
    handles.claim(handle, socket);
  } catch (err) {
    if (err instanceof Error && err.message === 'HANDLE_TAKEN') {
      sendToSocket(socket, {
        type: RelayEvent.ERROR,
        payload: { code: 'HANDLE_TAKEN', message: 'Someone else is using this name right now' },
      });
      return;
    }
    throw err;
  }
  sendToSocket(socket, {
    type: RelayEvent.HANDLE_CLAIMED,
    payload: { handle },
  });
}

function handleRingHandle(
  store: ISessionStore,
  handles: IHandleStore,
  socket: WebSocket,
  handle: string,
  ip: string,
): void {
  if (rejectIfBusy(store, handles, socket)) return;

  const claim = handles.get(handle);
  if (!claim) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: {
        code: 'HANDLE_UNAVAILABLE',
        message: 'This person is not online. Handles only work while they are connected.',
      },
    });
    return;
  }

  if (handles.inboundCount(handle) >= MAX_CONCURRENT_CHATS) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: {
        code: 'HANDLE_BUSY',
        message: 'This person already has too many conversations open',
      },
    });
    return;
  }

  if (!canCreateSession(store.size())) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: {
        code: 'SERVER_BUSY',
        message: `Session capacity reached (${MAX_RELAY_SESSIONS})`,
      },
    });
    return;
  }

  const sessionId = crypto.randomUUID().replace(/-/g, '');
  const participant: Participant = { id: createParticipantId(), socket };
  const session = store.create(sessionId, participant);
  handles.addInbound(handle, sessionId);

  logger.info({
    event: 'handle_ring',
    handle,
    sessionId: obfuscateSessionId(sessionId),
    ip: obfuscateIP(ip),
    timestamp: Date.now(),
  });

  sendToSocket(socket, {
    type: RelayEvent.RING_READY,
    payload: { sessionId, expiresAt: session.expiresAt },
  });
  sendToSocket(claim.socket, {
    type: RelayEvent.INCOMING_RING,
    payload: { sessionId, handle, expiresAt: session.expiresAt },
  });
}

function handleCreateSession(
  store: ISessionStore,
  handles: IHandleStore,
  socket: WebSocket,
  sessionId: string | undefined,
  ip: string,
): void {
  if (rejectIfBusy(store, handles, socket)) return;

  const id = sessionId ?? crypto.randomUUID().replace(/-/g, '');
  const current = store.get(id);

  // Reclaim an empty session after a mobile disconnect (reconnect grace)
  if (current && current.participants.length === 0) {
    cancelPendingDestroy(id);
    if (expireIfNeeded(store, current, handles)) {
      sendToSocket(socket, {
        type: RelayEvent.ERROR,
        payload: { code: 'SESSION_EXPIRED', message: 'Session has expired' },
      });
      return;
    }
    const participant: Participant = { id: createParticipantId(), socket };
    current.participants.push(participant);
    sendToSocket(socket, {
      type: RelayEvent.SESSION_CREATED,
      payload: { sessionId: id, expiresAt: current.expiresAt },
    });
    return;
  }

  if (current) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: { code: 'SESSION_EXISTS', message: 'Session already exists' },
    });
    return;
  }

  if (!canCreateSession(store.size())) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: {
        code: 'SERVER_BUSY',
        message: `Session capacity reached (${MAX_RELAY_SESSIONS})`,
      },
    });
    return;
  }

  const participant: Participant = { id: createParticipantId(), socket };
  const session = store.create(id, participant);

  // Security logging: Session created
  logger.info({
    event: 'session_created',
    sessionId: obfuscateSessionId(id),
    ip: obfuscateIP(ip),
    timestamp: Date.now(),
  });

  sendToSocket(socket, {
    type: RelayEvent.SESSION_CREATED,
    payload: { sessionId: id, expiresAt: session.expiresAt },
  });
}

function isSocketOpen(socket: { readyState?: number }): boolean {
  return socket.readyState === undefined || socket.readyState === 1;
}

function pruneDeadParticipants(session: Session): void {
  session.participants = session.participants.filter((p) => isSocketOpen(p.socket));
}

function sendJoinError(
  socket: WebSocket,
  code: 'SESSION_FULL' | 'JOIN_FAILED' | 'SESSION_NOT_FOUND' | 'SESSION_EXPIRED',
  message: string,
): void {
  sendToSocket(socket, {
    type: RelayEvent.ERROR,
    payload: { code, message },
  });
}

/** Wait for a racing close so a reconnect is not counted as a third person. */
const JOIN_RETRY_MS = 40;

function tryJoinSession(
  store: ISessionStore,
  socket: WebSocket,
  session: Session,
  ip: string,
): 'ok' | 'full' | 'failed' {
  pruneDeadParticipants(session);
  cancelPendingDestroy(session.id);

  const participant: Participant = { id: createParticipantId(), socket };
  if (session.participants.length === 0) {
    session.participants.push(participant);
    sendToSocket(socket, {
      type: RelayEvent.SESSION_CREATED,
      payload: { sessionId: session.id, expiresAt: session.expiresAt },
    });
    return 'ok';
  }

  try {
    store.addParticipant(session.id, participant);
    const updated = store.get(session.id)!;
    const sockets = updated.participants.map((p) => p.socket);

    logger.info({
      event: 'partner_joined',
      sessionId: obfuscateSessionId(session.id),
      participantCount: updated.participants.length,
      ip: obfuscateIP(ip),
      timestamp: Date.now(),
    });

    broadcast(sockets, {
      type: RelayEvent.PARTNER_JOINED,
      payload: {
        sessionId: session.id,
        participantCount: updated.participants.length,
        expiresAt: updated.expiresAt,
      },
    });
    return 'ok';
  } catch (err) {
    if (err instanceof Error && err.message === 'SESSION_FULL') {
      return 'full';
    }
    sendJoinError(socket, 'JOIN_FAILED', 'Failed to join');
    return 'failed';
  }
}

function handleJoinSession(
  store: ISessionStore,
  handles: IHandleStore,
  socket: WebSocket,
  sessionId: string,
  ip: string,
): void {
  if (rejectIfBusy(store, handles, socket)) return;

  const session = store.get(sessionId);
  if (!session) {
    logger.info({
      event: 'join_failed_not_found',
      sessionId: obfuscateSessionId(sessionId),
      ip: obfuscateIP(ip),
      timestamp: Date.now(),
    });
    sendJoinError(socket, 'SESSION_NOT_FOUND', 'Session does not exist');
    return;
  }

  if (expireIfNeeded(store, session, handles)) {
    sendJoinError(socket, 'SESSION_EXPIRED', 'Session has expired');
    return;
  }

  const result = tryJoinSession(store, socket, session, ip);
  if (result !== 'full') return;

  setTimeout(() => {
    if (store.findBySocket(socket) || handles.getBySocket(socket)) return;
    const current = store.get(sessionId);
    if (!current) {
      sendJoinError(socket, 'SESSION_NOT_FOUND', 'Session does not exist');
      return;
    }
    if (expireIfNeeded(store, current, handles)) {
      sendJoinError(socket, 'SESSION_EXPIRED', 'Session has expired');
      return;
    }
    const retry = tryJoinSession(store, socket, current, ip);
    if (retry === 'full') {
      sendJoinError(socket, 'SESSION_FULL', 'Session already has two participants');
    }
  }, JOIN_RETRY_MS);
}

function handleSendMessage(
  store: ISessionStore,
  socket: WebSocket,
  message: { id: string; encryptedPayload: string; timestamp: number },
  handles?: IHandleStore,
): void {
  const found = store.findBySocket(socket);
  if (!found) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: { code: 'NOT_IN_SESSION', message: 'Not in a session' },
    });
    return;
  }

  if (expireIfNeeded(store, found.session, handles)) {
    return;
  }

  const peers = found.session.participants.filter((p) => p.socket !== socket).map((p) => p.socket);

  broadcast(peers, {
    type: RelayEvent.MESSAGE,
    payload: { message },
  });
}

export function handleDisconnect(
  store: ISessionStore,
  socket: WebSocket,
  handles: IHandleStore = new InMemoryHandleStore(),
): void {
  handles.releaseBySocket(socket);
  handleLeave(store, handles, socket);
}

const pendingDestroy = new Map<string, ReturnType<typeof setTimeout>>();

function cancelPendingDestroy(sessionId: string): void {
  const timer = pendingDestroy.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    pendingDestroy.delete(sessionId);
  }
}

function scheduleDestroyIfEmpty(
  store: ISessionStore,
  sessionId: string,
  handles?: IHandleStore,
): void {
  cancelPendingDestroy(sessionId);
  const timer = setTimeout(() => {
    pendingDestroy.delete(sessionId);
    const session = store.get(sessionId);
    if (session && session.participants.length === 0) {
      store.destroy(sessionId);
      handles?.dropInbound(sessionId);
    }
  }, RECONNECT_GRACE_MS);
  pendingDestroy.set(sessionId, timer);
}

function handleLeave(store: ISessionStore, handles: IHandleStore, socket: WebSocket): void {
  const found = store.findBySocket(socket);
  if (!found) return;

  const { session, participant } = found;
  const peers = session.participants.filter((p) => p.id !== participant.id).map((p) => p.socket);

  const { destroyed } = store.removeParticipant(session.id, participant.id);

  if (!destroyed) {
    broadcast(peers, {
      type: RelayEvent.PARTNER_LEFT,
      payload: { sessionId: session.id },
    });
    return;
  }

  scheduleDestroyIfEmpty(store, session.id, handles);
}
