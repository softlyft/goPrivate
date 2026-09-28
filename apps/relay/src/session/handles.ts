import type { WebSocket } from '@fastify/websocket';

export interface HandleClaim {
  handle: string;
  socket: WebSocket;
  inboundSessionIds: Set<string>;
  claimedAt: number;
}

export interface IHandleStore {
  claim(handle: string, socket: WebSocket): HandleClaim;
  get(handle: string): HandleClaim | undefined;
  getBySocket(socket: WebSocket): HandleClaim | undefined;
  release(handle: string): HandleClaim | undefined;
  releaseBySocket(socket: WebSocket): HandleClaim | undefined;
  addInbound(handle: string, sessionId: string): void;
  dropInbound(sessionId: string): void;
  inboundCount(handle: string): number;
  size(): number;
}

/**
 * In-memory handle mailbox. Claims exist only while the owner's socket is
 * connected. Relay restarts wipe them, same as sessions.
 */
export class InMemoryHandleStore implements IHandleStore {
  private readonly byHandle = new Map<string, HandleClaim>();
  private readonly bySocket = new Map<WebSocket, string>();
  private readonly sessionToHandle = new Map<string, string>();

  claim(handle: string, socket: WebSocket): HandleClaim {
    const existing = this.byHandle.get(handle);
    if (existing && existing.socket !== socket) {
      throw new Error('HANDLE_TAKEN');
    }

    const previous = this.bySocket.get(socket);
    if (previous && previous !== handle) {
      this.release(previous);
    }

    if (existing && existing.socket === socket) {
      return existing;
    }

    const claim: HandleClaim = {
      handle,
      socket,
      inboundSessionIds: new Set(),
      claimedAt: Date.now(),
    };
    this.byHandle.set(handle, claim);
    this.bySocket.set(socket, handle);
    return claim;
  }

  get(handle: string): HandleClaim | undefined {
    return this.byHandle.get(handle);
  }

  getBySocket(socket: WebSocket): HandleClaim | undefined {
    const handle = this.bySocket.get(socket);
    return handle ? this.byHandle.get(handle) : undefined;
  }

  release(handle: string): HandleClaim | undefined {
    const claim = this.byHandle.get(handle);
    if (!claim) return undefined;
    this.byHandle.delete(handle);
    this.bySocket.delete(claim.socket);
    for (const sessionId of claim.inboundSessionIds) {
      this.sessionToHandle.delete(sessionId);
    }
    return claim;
  }

  releaseBySocket(socket: WebSocket): HandleClaim | undefined {
    const handle = this.bySocket.get(socket);
    if (!handle) return undefined;
    return this.release(handle);
  }

  addInbound(handle: string, sessionId: string): void {
    const claim = this.byHandle.get(handle);
    if (!claim) return;
    claim.inboundSessionIds.add(sessionId);
    this.sessionToHandle.set(sessionId, handle);
  }

  dropInbound(sessionId: string): void {
    const handle = this.sessionToHandle.get(sessionId);
    if (!handle) return;
    this.sessionToHandle.delete(sessionId);
    this.byHandle.get(handle)?.inboundSessionIds.delete(sessionId);
  }

  inboundCount(handle: string): number {
    return this.byHandle.get(handle)?.inboundSessionIds.size ?? 0;
  }

  size(): number {
    return this.byHandle.size;
  }
}
