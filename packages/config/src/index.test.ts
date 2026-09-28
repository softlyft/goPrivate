import { describe, expect, it } from 'vitest';
import native from './native.json' with { type: 'json' };
import {
  APP_NAME,
  DEEP_LINK_SCHEME,
  HANDLE_ALLOWLIST,
  MAX_CONCURRENT_CHATS,
  PREMIUM_MAX_CONCURRENT_CHATS,
  FREE_MAX_CONCURRENT_CHATS,
  concurrentChatLimitError,
  maxConcurrentChats,
  formatUsdt,
  premiumPriceUsdtYearly,
  PREMIUM_PRICE_USDT_MONTHLY,
  PREMIUM_YEARLY_DISCOUNT,
  OPERATOR_CONTACT_HANDLE,
  USDT_PAYMENT_ADDRESS,
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
  it('keeps Expo-requireable native.json in sync with exports', () => {
    expect(APP_NAME).toBe(native.APP_NAME);
    expect(DEEP_LINK_SCHEME).toBe(native.DEEP_LINK_SCHEME);
    expect(native.PUBLIC_WEB_ORIGINS[0]).toBe('https://goprivate.vercel.app');
  });

  it('exposes product defaults', () => {
    expect(APP_NAME.length).toBeGreaterThan(0);
    expect(FREE_MAX_CONCURRENT_CHATS).toBe(3);
    expect(PREMIUM_MAX_CONCURRENT_CHATS).toBe(7);
    expect(MAX_CONCURRENT_CHATS).toBe(PREMIUM_MAX_CONCURRENT_CHATS);
    expect(maxConcurrentChats(false)).toBe(FREE_MAX_CONCURRENT_CHATS);
    expect(maxConcurrentChats(true)).toBe(PREMIUM_MAX_CONCURRENT_CHATS);
    expect(concurrentChatLimitError(false)).toContain(String(FREE_MAX_CONCURRENT_CHATS));
    expect(concurrentChatLimitError(true)).toContain(String(PREMIUM_MAX_CONCURRENT_CHATS));
    expect(PREMIUM_PRICE_USDT_MONTHLY).toBe(2);
    expect(PREMIUM_YEARLY_DISCOUNT).toBe(0.1);
    expect(premiumPriceUsdtYearly()).toBe(21.6);
    expect(formatUsdt(PREMIUM_PRICE_USDT_MONTHLY)).toBe('2 USDT');
    expect(formatUsdt(premiumPriceUsdtYearly())).toBe('21.6 USDT');
    expect(OPERATOR_CONTACT_HANDLE).toBe('goprivate');
    expect(USDT_PAYMENT_ADDRESS.length).toBeGreaterThan(8);
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
    expect(isHandleSlug('about')).toBe(false);
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
    expect(extractHandle('https://goprivate.vercel.app/about')).toBeNull();
    expect(extractHandle('https://goprivate.vercel.app/guide')).toBeNull();
    expect(isHandleSlug('expo-development-client')).toBe(false);
    expect(
      extractHandle(`${DEEP_LINK_SCHEME}://expo-development-client/?url=http://localhost:8081`),
    ).toBeNull();
  });
});
