import { describe, expect, it, vi } from 'vitest';
import { WebSocketTransport } from './transport.js';

class FakeSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = 0;
  onopen: ((ev?: unknown) => void) | null = null;
  onerror: ((ev?: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];

  open(): void {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.({});
  }

  fail(): void {
    this.onerror?.({});
  }

  close(): void {
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.();
  }

  send(data: string): void {
    this.sent.push(data);
  }
}

function stubWebSocket(factory: () => FakeSocket): void {
  const Ctor = vi.fn(function WebSocket() {
    return factory();
  }) as unknown as typeof WebSocket & { OPEN: number; CLOSED: number };
  Ctor.OPEN = FakeSocket.OPEN;
  Ctor.CLOSED = FakeSocket.CLOSED;
  vi.stubGlobal('WebSocket', Ctor);
}

describe('WebSocketTransport', () => {
  it('resolves connect when socket opens', async () => {
    const fake = new FakeSocket();
    stubWebSocket(() => {
      queueMicrotask(() => fake.open());
      return fake;
    });

    const transport = new WebSocketTransport();
    const messages: string[] = [];
    const closes: number[] = [];
    const errors: unknown[] = [];
    transport.onMessage((d) => messages.push(d));
    transport.onClose(() => closes.push(1));
    transport.onError((e) => errors.push(e));

    await transport.connect('ws://example/ws');
    expect(transport.readyState).toBe(1);
    fake.onmessage?.({ data: 'hello' });
    fake.onmessage?.({ data: { not: 'string' } });
    expect(messages).toEqual(['hello']);
    transport.send('ping');
    expect(fake.sent).toEqual(['ping']);
    fake.close();
    expect(closes).toEqual([1]);
    transport.close();
    vi.unstubAllGlobals();
  });

  it('rejects connect on error', async () => {
    const fake = new FakeSocket();
    stubWebSocket(() => {
      queueMicrotask(() => fake.fail());
      return fake;
    });

    const transport = new WebSocketTransport();
    await expect(transport.connect('ws://example/ws', { timeoutMs: 1000 })).rejects.toThrow(
      /failed/i,
    );
    vi.unstubAllGlobals();
  });

  it('times out when socket never opens', async () => {
    stubWebSocket(() => new FakeSocket());

    const transport = new WebSocketTransport();
    await expect(transport.connect('ws://example/ws', { timeoutMs: 50 })).rejects.toThrow(
      /timed out/i,
    );
    vi.unstubAllGlobals();
  });

  it('rejects when socket closes before open', async () => {
    const fake = new FakeSocket();
    stubWebSocket(() => {
      queueMicrotask(() => fake.close());
      return fake;
    });
    const transport = new WebSocketTransport();
    await expect(transport.connect('ws://example/ws', { timeoutMs: 1000 })).rejects.toThrow(
      /closed/i,
    );
    vi.unstubAllGlobals();
  });

  it('ignores stale generation after reconnect supersedes prior socket', async () => {
    const first = new FakeSocket();
    const second = new FakeSocket();
    let n = 0;
    stubWebSocket(() => {
      n += 1;
      return n === 1 ? first : second;
    });

    const transport = new WebSocketTransport();
    void transport.connect('ws://a');
    const secondConnect = transport.connect('ws://b');
    queueMicrotask(() => {
      first.open();
      second.open();
    });
    await secondConnect;
    expect(transport.readyState).toBe(1);
    transport.close();
    vi.unstubAllGlobals();
  });
});
