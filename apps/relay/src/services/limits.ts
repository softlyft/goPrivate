import {
  MAX_RELAY_CONNECTIONS,
  MAX_RELAY_SESSIONS,
  RATE_LIMIT_MAX_ACTIONS,
  RATE_LIMIT_WINDOW_MS,
} from '@goprivate/protocol';

type Bucket = { count: number; resetAt: number };

const actionBuckets = new Map<string, Bucket>();
const sessionCreationByIP = new Map<string, { count: number; resetAt: number }>();

// Per-IP session creation limits: max 5 sessions per hour
const MAX_SESSIONS_PER_IP = 5;
const SESSION_CREATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function getClientIp(
  headers: Record<string, string | string[] | undefined>,
  remoteAddress?: string,
): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]!.trim();
  }
  return remoteAddress || 'unknown';
}

export function allowAction(ip: string, action: string): boolean {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const bucket = actionBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    actionBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX_ACTIONS) {
    return false;
  }
  bucket.count += 1;
  return true;
}

/** Check if IP can create a new session (per-IP limit) */
export function canCreateSessionFromIP(ip: string): boolean {
  const now = Date.now();
  const bucket = sessionCreationByIP.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    sessionCreationByIP.set(ip, { count: 1, resetAt: now + SESSION_CREATION_WINDOW_MS });
    return true;
  }

  if (bucket.count >= MAX_SESSIONS_PER_IP) {
    return false;
  }

  bucket.count += 1;
  return true;
}

/** Periodic cleanup so the map does not grow without bound. */
export function sweepRateLimits(now = Date.now()): void {
  for (const [key, bucket] of actionBuckets) {
    if (now >= bucket.resetAt) actionBuckets.delete(key);
  }
  for (const [ip, bucket] of sessionCreationByIP) {
    if (now >= bucket.resetAt) sessionCreationByIP.delete(ip);
  }
}

export function canAcceptConnection(openConnections: number): boolean {
  return openConnections < MAX_RELAY_CONNECTIONS;
}

export function canCreateSession(sessionCount: number): boolean {
  return sessionCount < MAX_RELAY_SESSIONS;
}

/** Test-only helper to clear rate-limit buckets between cases. */
export function resetRateLimitsForTests(): void {
  actionBuckets.clear();
}
