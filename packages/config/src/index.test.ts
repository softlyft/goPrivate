import { describe, expect, it } from 'vitest';
import {
  APP_NAME,
  DEEP_LINK_SCHEME,
  HANDLE_ALLOWLIST,
  MAX_CONCURRENT_CHATS,
  PIN_LENGTH,
  SESSION_TTL_MS,
  customSchemeHandleUrl,
  customSchemeUrl,
  extractHandle,
  isAllowedHandle,
  isHandleSlug,
  pinLengthLabel,
  pinPattern,
  publicChatUrl,
  publicHandleUrl,
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

  it('validates lasting-link handles and share URLs', () => {
    expect(isHandleSlug('alice')).toBe(true);
    expect(isHandleSlug('olumide-1')).toBe(true);
    expect(isHandleSlug('chat')).toBe(false);
    expect(isHandleSlug('Guide')).toBe(false);
    expect(isHandleSlug('A')).toBe(false);
    expect(isHandleSlug('1alice')).toBe(false);
    expect(HANDLE_ALLOWLIST).toEqual([]);
    expect(isAllowedHandle('alice')).toBe(true);
    expect(publicHandleUrl('Alice')).toBe('https://goprivate.vercel.app/alice');
    expect(customSchemeHandleUrl('Alice')).toBe(`${DEEP_LINK_SCHEME}://alice`);
  });

  it('extracts handles from public and custom-scheme URLs', () => {
    expect(extractHandle('alice')).toBe('alice');
    expect(extractHandle('https://goprivate.vercel.app/alice')).toBe('alice');
    expect(extractHandle(`${DEEP_LINK_SCHEME}://alice`)).toBe('alice');
    expect(extractHandle('https://goprivate.vercel.app/chat/aa')).toBeNull();
    expect(extractHandle(`https://goprivate.vercel.app/chat/${'a'.repeat(32)}`)).toBeNull();
    expect(extractHandle('https://goprivate.vercel.app/guide')).toBeNull();
  });
});
