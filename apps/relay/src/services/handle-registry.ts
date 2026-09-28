import { existsSync, readFileSync } from 'node:fs';
import { createPublicKey, verify as verifySignature } from 'node:crypto';
import { handleClaimMessage } from '@goprivate/protocol';

export interface HandleLease {
  publicKey: string;
  expiresAt: number;
}

export type HandleRegistry = Record<string, HandleLease>;

const CLAIM_SKEW_MS = 2 * 60 * 1000;

export function parseExpiresAt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length > 0) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

export function parseHandleRegistry(raw: unknown): HandleRegistry {
  if (!isRecord(raw)) return {};
  const source = isRecord(raw.handles) ? raw.handles : raw;
  const registry: HandleRegistry = {};
  for (const [name, entry] of Object.entries(source)) {
    if (!isRecord(entry) || typeof entry.publicKey !== 'string') continue;
    const expiresAt = parseExpiresAt(entry.expiresAt);
    if (expiresAt === null) continue;
    registry[name.trim().toLowerCase()] = {
      publicKey: entry.publicKey,
      expiresAt,
    };
  }
  return registry;
}

export function loadHandleRegistryFile(filePath: string): HandleRegistry {
  if (!existsSync(filePath)) return {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
    return parseHandleRegistry(parsed);
  } catch {
    return {};
  }
}

export function verifyHandleLeaseProof(
  lease: HandleLease,
  handle: string,
  proof: { publicKey: string; signedAt: number; signature: string },
  now = Date.now(),
): 'ok' | 'HANDLE_EXPIRED' | 'HANDLE_FORBIDDEN' {
  if (now >= lease.expiresAt) return 'HANDLE_EXPIRED';
  if (Math.abs(now - proof.signedAt) > CLAIM_SKEW_MS) return 'HANDLE_FORBIDDEN';
  if (!keysEqual(proof.publicKey, lease.publicKey)) return 'HANDLE_FORBIDDEN';

  try {
    const key = createPublicKey({
      key: Buffer.from(lease.publicKey, 'base64'),
      format: 'der',
      type: 'spki',
    });
    const ok = verifySignature(
      'sha256',
      Buffer.from(handleClaimMessage(handle, proof.signedAt), 'utf8'),
      { key, dsaEncoding: 'ieee-p1363' },
      Buffer.from(proof.signature, 'base64'),
    );
    return ok ? 'ok' : 'HANDLE_FORBIDDEN';
  } catch {
    return 'HANDLE_FORBIDDEN';
  }
}

function keysEqual(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, 'base64');
    const b = Buffer.from(right, 'base64');
    if (a.length !== b.length) return false;
    return a.equals(b);
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
