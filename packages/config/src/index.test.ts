import { describe, expect, it } from 'vitest';
import {
  APP_NAME,
  DEEP_LINK_SCHEME,
  MAX_CONCURRENT_CHATS,
  PIN_LENGTH,
  SESSION_TTL_MS,
  customSchemeUrl,
  pinLengthLabel,
  pinPattern,
  publicChatUrl,
  sessionTtlLabel,
} from './index.js';

describe('@goprivate/config', () => {
  it('exposes product defaults', () => {
    expect(APP_NAME.length).toBeGreaterThan(0);
    expect(MAX_CONCURRENT_CHATS).toBeGreaterThan(0);
    expect(PIN_LENGTH).toBeGreaterThan(0);
    expect(SESSION_TTL_MS).toBeGreaterThan(0);
  });

  it('builds share URLs and PIN helpers from those defaults', () => {
    expect(publicChatUrl('aa'.repeat(16))).toContain('/chat/');
    expect(customSchemeUrl('aa'.repeat(16))).toBe(`${DEEP_LINK_SCHEME}://chat/${'aa'.repeat(16)}`);
    expect(pinPattern().test('0'.repeat(PIN_LENGTH))).toBe(true);
    expect(pinPattern().test('0'.repeat(PIN_LENGTH - 1))).toBe(false);
    expect(pinLengthLabel()).toContain(String(PIN_LENGTH));
    expect(sessionTtlLabel().length).toBeGreaterThan(0);
  });
});
