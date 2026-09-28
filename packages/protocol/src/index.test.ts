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
  handleClaimMessage,
} from './index.js';

describe('@goprivate/protocol', () => {
  it('exports stable event names', () => {
    expect(ClientEvent.CREATE_SESSION).toBe('CREATE_SESSION');
    expect(ClientEvent.JOIN_SESSION).toBe('JOIN_SESSION');
    expect(ClientEvent.CLAIM_HANDLE).toBe('CLAIM_HANDLE');
    expect(handleClaimMessage('alice', 1)).toBe('goprivate:claim:alice:1');
    expect(ClientEvent.RING_HANDLE).toBe('RING_HANDLE');
    expect(RelayEvent.SESSION_CREATED).toBe('SESSION_CREATED');
    expect(RelayEvent.HANDLE_CLAIMED).toBe('HANDLE_CLAIMED');
    expect(RelayEvent.INCOMING_RING).toBe('INCOMING_RING');
    expect(RelayEvent.RING_READY).toBe('RING_READY');
    expect(RelayEvent.ERROR).toBe('ERROR');
    expect(handleClaimMessage('alice', 1)).toBe('goprivate:claim:alice:1');
    expect(AppMessageKind.CHAT).toBe('CHAT');
    expect(AppMessageKind.PUBLIC_KEY).toBe('PUBLIC_KEY');
  });

  it('defines production limits', () => {
    expect(SESSION_TTL_MS).toBeGreaterThan(0);
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
