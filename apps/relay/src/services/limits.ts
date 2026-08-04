import {
  MAX_RELAY_CONNECTIONS,
  MAX_RELAY_SESSIONS,
  RATE_LIMIT_MAX_ACTIONS,
  RATE_LIMIT_WINDOW_MS,
} from '@goprivate/protocol';

type Bucket = { count: number; resetAt: number };

const actionBuckets = new Map<string, Bucket>();

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

/** Periodic cleanup so the map does not grow without bound. */
export function sweepRateLimits(now = Date.now()): void {
  for (const [key, bucket] of actionBuckets) {
    if (now >= bucket.resetAt) actionBuckets.delete(key);
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
