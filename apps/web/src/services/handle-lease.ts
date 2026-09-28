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
const PREFERRED_KEY = 'goprivate.handle.preferred';

function storage(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

function keyFor(handle: string): string {
  return `${PREFIX}${handle}`;
}

function recoverHandleFromLeases(store: Storage): string | null {
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    const handle = key.slice(PREFIX.length).trim().toLowerCase();
    if (handle) return handle;
  }
  return null;
}

export function loadPreferredHandle(): string | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(PREFERRED_KEY);
  if (raw === '') return null;
  const handle = raw?.trim().toLowerCase();
  if (handle) return handle;
  const recovered = recoverHandleFromLeases(store);
  if (recovered) savePreferredHandle(recovered);
  return recovered;
}

export function savePreferredHandle(handle: string): void {
  const normalized = handle.trim().toLowerCase();
  if (!normalized) return;
  storage()?.setItem(PREFERRED_KEY, normalized);
}

export function clearPreferredHandle(): void {
  storage()?.setItem(PREFERRED_KEY, '');
}

export function loadHandleLease(handle: string): StoredHandleLease | null {
  const raw = storage()?.getItem(keyFor(handle));
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
  const store = storage();
  if (!store) return;
  store.setItem(keyFor(lease.handle), JSON.stringify(lease));
  savePreferredHandle(lease.handle);
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
