import {
  exportLeasePublicKey,
  importLeasePrivateKey,
  parseHandleLeasePaste,
  signHandleClaim,
} from '@goprivate/crypto';
import { handleClaimMessage, type ClaimHandleProof } from '@goprivate/protocol';

export interface StoredHandleLease {
  handle: string;
  privateKey: string;
  publicKey?: string;
  expiresAt?: number;
}

const PREFIX = 'goprivate.lease.';

function keyFor(handle: string): string {
  return `${PREFIX}${handle}`;
}

export function loadHandleLease(handle: string): StoredHandleLease | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(keyFor(handle));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredHandleLease;
    if (typeof parsed.privateKey !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveHandleLease(lease: StoredHandleLease): void {
  localStorage.setItem(keyFor(lease.handle), JSON.stringify(lease));
}

export function saveHandleLeaseFromPaste(handle: string, paste: string): StoredHandleLease {
  const parsed = parseHandleLeasePaste(paste);
  if (!parsed) {
    throw new Error('That does not look like a lease key');
  }
  const lease: StoredHandleLease = {
    handle: (parsed.handle ?? handle).toLowerCase(),
    privateKey: parsed.privateKey,
    publicKey: parsed.publicKey,
    expiresAt: parsed.expiresAt,
  };
  saveHandleLease(lease);
  return lease;
}

export async function createHandleProof(handle: string): Promise<ClaimHandleProof | null> {
  const lease = loadHandleLease(handle);
  if (!lease) return null;
  const signedAt = Date.now();
  const signature = await signHandleClaim(lease.privateKey, handleClaimMessage(handle, signedAt));
  let publicKey = lease.publicKey;
  if (!publicKey) {
    const key = await importLeasePrivateKey(lease.privateKey);
    publicKey = await exportLeasePublicKey(key);
    saveHandleLease({ ...lease, publicKey });
  }
  return { publicKey, signedAt, signature };
}
