import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRelayUrl, getShareUrl } from './env.js';

describe('env utils', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns configured relay url or default', () => {
    vi.stubEnv('NEXT_PUBLIC_RELAY_URL', 'wss://example/ws');
    expect(getRelayUrl()).toBe('wss://example/ws');
    vi.stubEnv('NEXT_PUBLIC_RELAY_URL', '');
    // empty string is falsy → default
    expect(getRelayUrl()).toBe('ws://localhost:3001/ws');
  });

  it('builds share urls for ssr and browser', () => {
    expect(getShareUrl('abc')).toBe('/chat/abc');
    vi.stubGlobal('window', { location: { origin: 'https://app.test' } });
    expect(getShareUrl('abc')).toBe('https://app.test/chat/abc');
  });
});
