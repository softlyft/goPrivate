import {
  MAX_RELAY_CONNECTIONS,
  MAX_RELAY_SESSIONS,
  RATE_LIMIT_MAX_ACTIONS,
} from '@goprivate/protocol';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  allowAction,
  canAcceptConnection,
  canCreateSession,
  getClientIp,
  resetRateLimitsForTests,
  sweepRateLimits,
} from './limits.js';

describe('relay limits', () => {
  beforeEach(() => {
    resetRateLimitsForTests();
  });

  it('reads client IP from x-forwarded-for', () => {
    expect(getClientIp({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })).toBe('1.2.3.4');
    expect(getClientIp({ 'x-forwarded-for': ['9.9.9.9, 8.8.8.8'] })).toBe('9.9.9.9');
    expect(getClientIp({}, '10.0.0.1')).toBe('10.0.0.1');
    expect(getClientIp({})).toBe('unknown');
  });

  it('rate limits actions per ip', () => {
    for (let i = 0; i < RATE_LIMIT_MAX_ACTIONS; i++) {
      expect(allowAction('1.1.1.1', 'create')).toBe(true);
    }
    expect(allowAction('1.1.1.1', 'create')).toBe(false);
    expect(allowAction('2.2.2.2', 'create')).toBe(true);
  });

  it('sweeps expired buckets', () => {
    allowAction('3.3.3.3', 'join');
    sweepRateLimits(Date.now() + 120_000);
    expect(allowAction('3.3.3.3', 'join')).toBe(true);
  });

  it('enforces connection and session caps', () => {
    expect(canAcceptConnection(MAX_RELAY_CONNECTIONS - 1)).toBe(true);
    expect(canAcceptConnection(MAX_RELAY_CONNECTIONS)).toBe(false);
    expect(canCreateSession(MAX_RELAY_SESSIONS - 1)).toBe(true);
    expect(canCreateSession(MAX_RELAY_SESSIONS)).toBe(false);
  });
});
