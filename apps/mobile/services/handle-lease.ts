import * as SecureStore from 'expo-secure-store';
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

const PREFERRED_KEY = 'goprivate.handle.preferred';

function keyFor(handle: string): string {
  return `goprivate.lease.${handle}`;
}

export async function loadPreferredHandle(): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(PREFERRED_KEY);
  if (raw === '') return null;
  const handle = raw?.trim().toLowerCase();
  return handle || null;
}

export async function savePreferredHandle(handle: string): Promise<void> {
  const normalized = handle.trim().toLowerCase();
  if (!normalized) return;
  await SecureStore.setItemAsync(PREFERRED_KEY, normalized);
}

export async function clearPreferredHandle(): Promise<void> {
  await SecureStore.setItemAsync(PREFERRED_KEY, '');
}

export async function loadHandleLease(handle: string): Promise<StoredHandleLease | null> {
  const raw = await SecureStore.getItemAsync(keyFor(handle));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredHandleLease;
    if (typeof parsed.privateKey !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveHandleLease(lease: StoredHandleLease): Promise<void> {
  await SecureStore.setItemAsync(keyFor(lease.handle), JSON.stringify(lease));
  await savePreferredHandle(lease.handle);
}

export async function saveHandleLeaseFromPaste(
  handle: string,
  paste: string,
): Promise<StoredHandleLease> {
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
  await saveHandleLease(lease);
  return lease;
}

export async function createHandleProof(handle: string): Promise<ClaimHandleProof | null> {
  const lease = await loadHandleLease(handle);
  if (!lease) return null;
  const signedAt = Date.now();
  const signature = await signHandleClaim(lease.privateKey, handleClaimMessage(handle, signedAt));
  let publicKey = lease.publicKey;
  if (!publicKey) {
    const key = await importLeasePrivateKey(lease.privateKey);
    publicKey = await exportLeasePublicKey(key);
    await saveHandleLease({ ...lease, publicKey });
  }
  return { publicKey, signedAt, signature };
}
