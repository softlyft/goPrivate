import { describe, expect, it } from 'vitest';
import {
  AppMessageKind,
  ClientEvent,
  MAX_CHAT_TEXT_CHARS,
  MAX_RELAY_CONNECTIONS,
  MAX_RELAY_SESSIONS,
  RelayEvent,
  SESSION_ID_PATTERN,
  SESSION_TTL_MS,
} from './index.js';

describe('@goprivate/protocol', () => {
  it('exports stable event names', () => {
    expect(ClientEvent.CREATE_SESSION).toBe('CREATE_SESSION');
    expect(ClientEvent.JOIN_SESSION).toBe('JOIN_SESSION');
    expect(RelayEvent.SESSION_CREATED).toBe('SESSION_CREATED');
    expect(RelayEvent.ERROR).toBe('ERROR');
    expect(AppMessageKind.CHAT).toBe('CHAT');
    expect(AppMessageKind.PUBLIC_KEY).toBe('PUBLIC_KEY');
  });

  it('defines production limits', () => {
    expect(SESSION_TTL_MS).toBe(15 * 60 * 1000);
    expect(MAX_CHAT_TEXT_CHARS).toBe(4000);
    expect(MAX_RELAY_SESSIONS).toBeGreaterThan(0);
    expect(MAX_RELAY_CONNECTIONS).toBeGreaterThan(MAX_RELAY_SESSIONS);
  });

  it('validates session id pattern', () => {
    expect(SESSION_ID_PATTERN.test('a'.repeat(32))).toBe(true);
    expect(SESSION_ID_PATTERN.test('0123456789abcdef')).toBe(true);
    expect(SESSION_ID_PATTERN.test('short')).toBe(false);
    expect(SESSION_ID_PATTERN.test('not-hex-!!!!!!')).toBe(false);
  });
});
