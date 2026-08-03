import type { WebSocket } from '@fastify/websocket';
import {
  ClientEvent,
  RelayEvent,
  type ClientToRelayMessage,
} from '@goprivate/protocol';
import type { ISessionStore, Participant, Session } from '../session/store.js';
import { broadcast, sendToSocket } from '../services/messenger.js';

function createParticipantId(): string {
  return crypto.randomUUID();
}

export function createMessageHandler(store: ISessionStore) {
  return function handleMessage(socket: WebSocket, raw: string): void {
    let message: ClientToRelayMessage;
    try {
      message = JSON.parse(raw) as ClientToRelayMessage;
    } catch {
      sendToSocket(socket, {
        type: RelayEvent.ERROR,
        payload: { code: 'INVALID_JSON', message: 'Could not parse message' },
      });
      return;
    }

    switch (message.type) {
      case ClientEvent.CREATE_SESSION:
        handleCreateSession(store, socket, message.payload?.sessionId);
        break;
      case ClientEvent.JOIN_SESSION:
        handleJoinSession(store, socket, message.payload.sessionId);
        break;
      case ClientEvent.SEND_MESSAGE:
        handleSendMessage(store, socket, message.payload.message);
        break;
      case ClientEvent.PING:
        sendToSocket(socket, { type: RelayEvent.PONG, payload: {} });
        break;
      case ClientEvent.LEAVE_SESSION:
        handleLeave(store, socket);
        break;
      default:
        sendToSocket(socket, {
          type: RelayEvent.ERROR,
          payload: { code: 'UNKNOWN_EVENT', message: 'Unknown event type' },
        });
    }
  };
}

function expireIfNeeded(store: ISessionStore, session: Session): boolean {
  if (!store.isExpired(session)) return false;
  expireSession(store, session);
  return true;
}

export function expireSession(store: ISessionStore, session: Session): void {
  const sockets = session.participants.map((p) => p.socket);
  broadcast(sockets, {
    type: RelayEvent.SESSION_EXPIRED,
    payload: { sessionId: session.id },
  });
  store.destroy(session.id);
  for (const socket of sockets) {
    try {
      socket.close();
    } catch {
      // ignore
    }
  }
}

export function sweepExpiredSessions(store: ISessionStore): number {
  const expired = store.getExpired();
  for (const session of expired) {
    expireSession(store, session);
  }
  return expired.length;
}

function handleCreateSession(
  store: ISessionStore,
  socket: WebSocket,
  sessionId?: string,
): void {
  const existing = store.findBySocket(socket);
  if (existing) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: { code: 'ALREADY_IN_SESSION', message: 'Socket already in a session' },
    });
    return;
  }

  const id = sessionId ?? crypto.randomUUID().replace(/-/g, '');
  if (store.get(id)) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: { code: 'SESSION_EXISTS', message: 'Session already exists' },
    });
    return;
  }

  const participant: Participant = { id: createParticipantId(), socket };
  const session = store.create(id, participant);

  sendToSocket(socket, {
    type: RelayEvent.SESSION_CREATED,
    payload: { sessionId: id, expiresAt: session.expiresAt },
  });
}

function handleJoinSession(store: ISessionStore, socket: WebSocket, sessionId: string): void {
  const existing = store.findBySocket(socket);
  if (existing) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: { code: 'ALREADY_IN_SESSION', message: 'Socket already in a session' },
    });
    return;
  }

  const session = store.get(sessionId);
  if (!session) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: { code: 'SESSION_NOT_FOUND', message: 'Session does not exist' },
    });
    return;
  }

  if (expireIfNeeded(store, session)) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: { code: 'SESSION_EXPIRED', message: 'Session has expired' },
    });
    return;
  }

  try {
    const participant: Participant = { id: createParticipantId(), socket };
    store.addParticipant(sessionId, participant);

    const updated = store.get(sessionId)!;
    const sockets = updated.participants.map((p) => p.socket);

    broadcast(sockets, {
      type: RelayEvent.PARTNER_JOINED,
      payload: {
        sessionId,
        participantCount: updated.participants.length,
        expiresAt: updated.expiresAt,
      },
    });
  } catch (err) {
    const code = err instanceof Error && err.message === 'SESSION_FULL' ? 'SESSION_FULL' : 'JOIN_FAILED';
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: {
        code,
        message: code === 'SESSION_FULL' ? 'Session already has two participants' : 'Failed to join',
      },
    });
  }
}

function handleSendMessage(
  store: ISessionStore,
  socket: WebSocket,
  message: { id: string; encryptedPayload: string; timestamp: number },
): void {
  const found = store.findBySocket(socket);
  if (!found) {
    sendToSocket(socket, {
      type: RelayEvent.ERROR,
      payload: { code: 'NOT_IN_SESSION', message: 'Not in a session' },
    });
    return;
  }

  if (expireIfNeeded(store, found.session)) {
    return;
  }

  const peers = found.session.participants
    .filter((p) => p.socket !== socket)
    .map((p) => p.socket);

  broadcast(peers, {
    type: RelayEvent.MESSAGE,
    payload: { message },
  });
}

export function handleDisconnect(store: ISessionStore, socket: WebSocket): void {
  handleLeave(store, socket);
}

function handleLeave(store: ISessionStore, socket: WebSocket): void {
  const found = store.findBySocket(socket);
  if (!found) return;

  const { session, participant } = found;
  const peers = session.participants
    .filter((p) => p.id !== participant.id)
    .map((p) => p.socket);

  const { destroyed } = store.removeParticipant(session.id, participant.id);

  if (!destroyed) {
    broadcast(peers, {
      type: RelayEvent.PARTNER_LEFT,
      payload: { sessionId: session.id },
    });
  }
}
