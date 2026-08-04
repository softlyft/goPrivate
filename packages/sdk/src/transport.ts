import type { ITransport } from './types.js';

const DEFAULT_CONNECT_TIMEOUT_MS = 45_000;

export class WebSocketTransport implements ITransport {
  private socket: WebSocket | null = null;
  private generation = 0;
  private messageHandler: ((data: string) => void) | null = null;
  private closeHandler: (() => void) | null = null;
  private errorHandler: ((error: Event) => void) | null = null;

  get readyState(): number {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }

  connect(url: string, options?: { timeoutMs?: number }): Promise<void> {
    return new Promise((resolve, reject) => {
      const generation = ++this.generation;
      this.detachSocket();

      const timeoutMs = options?.timeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
      let settled = false;

      const timer = setTimeout(() => {
        if (settled || generation !== this.generation) return;
        settled = true;
        try {
          socket.close();
        } catch {
          // ignore
        }
        reject(new Error('WebSocket connection timed out — relay may be waking up'));
      }, timeoutMs);

      const socket = new WebSocket(url);

      socket.onopen = () => {
        if (generation !== this.generation) {
          try {
            socket.close();
          } catch {
            // ignore
          }
          return;
        }
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.socket = socket;
        resolve();
      };

      socket.onerror = (event) => {
        if (generation !== this.generation) return;
        this.errorHandler?.(event);
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error('WebSocket connection failed'));
      };

      socket.onmessage = (event) => {
        if (generation !== this.generation) return;
        if (typeof event.data === 'string') {
          this.messageHandler?.(event.data);
        }
      };

      socket.onclose = () => {
        if (generation !== this.generation) return;
        this.socket = null;
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error('WebSocket closed before open'));
        } else {
          this.closeHandler?.();
        }
      };
    });
  }

  send(data: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Transport is not connected');
    }
    this.socket.send(data);
  }

  onMessage(handler: (data: string) => void): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  onError(handler: (error: Event) => void): void {
    this.errorHandler = handler;
  }

  close(): void {
    this.generation += 1;
    this.detachSocket();
  }

  private detachSocket(): void {
    if (!this.socket) return;
    const socket = this.socket;
    this.socket = null;
    socket.onopen = null;
    socket.onerror = null;
    socket.onmessage = null;
    socket.onclose = null;
    try {
      socket.close();
    } catch {
      // ignore
    }
  }
}
