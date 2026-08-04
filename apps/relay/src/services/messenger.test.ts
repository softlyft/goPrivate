import { RelayEvent } from '@goprivate/protocol';
import { describe, expect, it, vi } from 'vitest';
import { broadcast, sendToSocket } from './messenger.js';

describe('messenger', () => {
  it('sends JSON to an open socket', () => {
    const send = vi.fn();
    sendToSocket({ readyState: 1, OPEN: 1, send } as never, {
      type: RelayEvent.PONG,
      payload: {},
    });
    expect(send).toHaveBeenCalledWith(JSON.stringify({ type: RelayEvent.PONG, payload: {} }));
  });

  it('ignores closed sockets', () => {
    const send = vi.fn();
    sendToSocket({ readyState: 3, OPEN: 1, send } as never, {
      type: RelayEvent.PONG,
      payload: {},
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('broadcasts to all sockets except excluded', () => {
    const a = { readyState: 1, OPEN: 1, send: vi.fn() };
    const b = { readyState: 1, OPEN: 1, send: vi.fn() };
    broadcast([a, b] as never, { type: RelayEvent.PONG, payload: {} }, a as never);
    expect(a.send).not.toHaveBeenCalled();
    expect(b.send).toHaveBeenCalled();
  });
});
