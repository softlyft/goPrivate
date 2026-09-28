import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { handleClaimMessage } from '@goprivate/protocol';
import { parseHandleRegistry, verifyHandleLeaseProof } from './handle-registry.js';

function issueLease() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const publicKeyB64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const signedAt = Date.now();
  const signature = sign('sha256', Buffer.from(handleClaimMessage('alice', signedAt)), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64');
  return {
    lease: { publicKey: publicKeyB64, expiresAt: Date.now() + 60_000 },
    proof: { publicKey: publicKeyB64, signedAt, signature },
  };
}

describe('handle registry', () => {
  it('parses public keys and ISO expiry', () => {
    const registry = parseHandleRegistry({
      alice: { publicKey: 'abc', expiresAt: '2026-10-28T00:00:00.000Z' },
    });
    expect(registry.alice?.publicKey).toBe('abc');
    expect(registry.alice?.expiresAt).toBe(Date.parse('2026-10-28T00:00:00.000Z'));
  });

  it('accepts a matching unexpired signature', () => {
    const { lease, proof } = issueLease();
    expect(verifyHandleLeaseProof(lease, 'alice', proof)).toBe('ok');
  });

  it('rejects expired leases and the wrong name', () => {
    const { lease, proof } = issueLease();
    expect(verifyHandleLeaseProof({ ...lease, expiresAt: Date.now() - 1 }, 'alice', proof)).toBe(
      'HANDLE_EXPIRED',
    );
    expect(verifyHandleLeaseProof(lease, 'bob', proof)).toBe('HANDLE_FORBIDDEN');
  });
});
