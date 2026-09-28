import { describe, expect, it } from 'vitest';
import { InMemoryHandleStore } from './handles.js';

function sock(id: string): { id: string } {
  return { id };
}

describe('InMemoryHandleStore', () => {
  it('claims and releases a handle for one socket', () => {
    const store = new InMemoryHandleStore();
    const a = sock('a') as never;
    store.claim('alice', a);
    expect(store.get('alice')?.socket).toBe(a);
    expect(store.getBySocket(a)?.handle).toBe('alice');
    store.releaseBySocket(a);
    expect(store.get('alice')).toBeUndefined();
    expect(store.size()).toBe(0);
  });

  it('rejects a second claimant', () => {
    const store = new InMemoryHandleStore();
    store.claim('alice', sock('a') as never);
    expect(() => store.claim('alice', sock('b') as never)).toThrow('HANDLE_TAKEN');
  });

  it('lets the same socket reclaim, and tracks inbound sessions', () => {
    const store = new InMemoryHandleStore();
    const a = sock('a') as never;
    store.claim('alice', a);
    store.claim('alice', a);
    store.addInbound('alice', 'sess-1');
    store.addInbound('alice', 'sess-2');
    expect(store.inboundCount('alice')).toBe(2);
    store.dropInbound('sess-1');
    expect(store.inboundCount('alice')).toBe(1);
    store.release('alice');
    expect(store.inboundCount('alice')).toBe(0);
  });

  it('moving a socket to a new handle drops the old claim', () => {
    const store = new InMemoryHandleStore();
    const a = sock('a') as never;
    store.claim('alice', a);
    store.claim('bob', a);
    expect(store.get('alice')).toBeUndefined();
    expect(store.get('bob')?.socket).toBe(a);
  });
});
