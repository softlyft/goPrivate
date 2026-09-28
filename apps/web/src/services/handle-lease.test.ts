import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearPreferredHandle,
  loadHandleLease,
  loadPreferredHandle,
  saveHandleLease,
  saveHandleLeaseFromPaste,
  savePreferredHandle,
} from './handle-lease.js';

class MemoryStorage {
  private readonly data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe('handle lease storage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('remembers the preferred handle and lease key', () => {
    saveHandleLease({
      handle: 'goprivate',
      privateKey: 'secret-key',
      publicKey: 'pub',
    });

    expect(loadPreferredHandle()).toBe('goprivate');
    expect(loadHandleLease('goprivate')).toMatchObject({
      handle: 'goprivate',
      privateKey: 'secret-key',
    });
  });

  it('keeps the lease after clearing the preferred handle', () => {
    saveHandleLease({ handle: 'alice', privateKey: 'k' });
    clearPreferredHandle();
    expect(loadPreferredHandle()).toBeNull();
    expect(loadHandleLease('alice')?.privateKey).toBe('k');
  });

  it('saves a pasted issue-handle block and remembers the name', () => {
    saveHandleLeaseFromPaste(
      'alice',
      `handle=alice
privateKey=priv
publicKey=pub`,
    );
    expect(loadPreferredHandle()).toBe('alice');
    expect(loadHandleLease('alice')?.privateKey).toBe('priv');
  });

  it('rejects a paste that is not a lease key', () => {
    expect(() => saveHandleLeaseFromPaste('alice', 'not-a-key')).toThrow(/lease key/i);
    expect(loadPreferredHandle()).toBeNull();
  });

  it('normalizes preferred handle names', () => {
    savePreferredHandle('  GoPrivate  ');
    expect(loadPreferredHandle()).toBe('goprivate');
  });

  it('recovers the preferred handle from a stored lease', () => {
    globalThis.localStorage.setItem(
      'goprivate.lease.goprivate',
      JSON.stringify({ handle: 'goprivate', privateKey: 'k' }),
    );
    expect(loadPreferredHandle()).toBe('goprivate');
  });
});
