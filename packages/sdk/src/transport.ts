import type { ITransport } from './types.js';

export class WebSocketTransport implements ITransport {
  private socket: WebSocket | null = null;
  private messageHandler: ((data: string) => void) | null = null;
  private closeHandler: (() => void) | null = null;
  private errorHandler: ((error: Event) => void) | null = null;

  get readyState(): number {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);

      socket.onopen = () => {
        this.socket = socket;
        resolve();
      };

      socket.onerror = (event) => {
        this.errorHandler?.(event);
        reject(new Error('WebSocket connection failed'));
      };

      socket.onmessage = (event) => {
        if (typeof event.data === 'string') {
          this.messageHandler?.(event.data);
        }
      };

      socket.onclose = () => {
        this.closeHandler?.();
        this.socket = null;
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
    this.socket?.close();
    this.socket = null;
  }
}
