import { SESSION_TTL_MS } from '@goprivate/protocol';

/**
 * In-memory session store.
 * No persistence. Sessions exist only while participants are connected,
 * and are destroyed after SESSION_TTL_MS regardless.
 */
export interface Participant {
  id: string;
  socket: import('@fastify/websocket').WebSocket;
}

export interface Session {
  id: string;
  participants: Participant[];
  createdAt: number;
  expiresAt: number;
}

export interface ISessionStore {
  create(sessionId: string, participant: Participant): Session;
  get(sessionId: string): Session | undefined;
  addParticipant(sessionId: string, participant: Participant): Session | undefined;
  removeParticipant(sessionId: string, participantId: string): { destroyed: boolean };
  findBySocket(socket: import('@fastify/websocket').WebSocket): {
    session: Session;
    participant: Participant;
  } | null;
  destroy(sessionId: string): void;
  size(): number;
  getExpired(): Session[];
  isExpired(session: Session, now?: number): boolean;
}

export class InMemorySessionStore implements ISessionStore {
  private sessions = new Map<string, Session>();

  create(sessionId: string, participant: Participant): Session {
    if (this.sessions.has(sessionId)) {
      throw new Error('SESSION_EXISTS');
    }
    const createdAt = Date.now();
    const session: Session = {
      id: sessionId,
      participants: [participant],
      createdAt,
      expiresAt: createdAt + SESSION_TTL_MS,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  get(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  addParticipant(sessionId: string, participant: Participant): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (session.participants.length >= 2) {
      throw new Error('SESSION_FULL');
    }
    session.participants.push(participant);
    return session;
  }

  removeParticipant(sessionId: string, participantId: string): { destroyed: boolean } {
    const session = this.sessions.get(sessionId);
    if (!session) return { destroyed: false };

    session.participants = session.participants.filter((p) => p.id !== participantId);

    if (session.participants.length === 0) {
      this.sessions.delete(sessionId);
      return { destroyed: true };
    }

    return { destroyed: false };
  }

  findBySocket(socket: import('@fastify/websocket').WebSocket): {
    session: Session;
    participant: Participant;
  } | null {
    for (const session of this.sessions.values()) {
      const participant = session.participants.find((p) => p.socket === socket);
      if (participant) {
        return { session, participant };
      }
    }
    return null;
  }

  destroy(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  size(): number {
    return this.sessions.size;
  }

  isExpired(session: Session, now = Date.now()): boolean {
    return now >= session.expiresAt;
  }

  getExpired(now = Date.now()): Session[] {
    return Array.from(this.sessions.values()).filter((s) => this.isExpired(s, now));
  }
}
