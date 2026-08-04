import { describe, expect, it } from 'vitest';
import { createCryptoProvider } from './index.js';

describe('@goprivate/crypto', () => {
  const crypto = createCryptoProvider();

  it('round-trips ECDH + AES-GCM between two parties', async () => {
    const alice = await crypto.generateKeyPair();
    const bob = await crypto.generateKeyPair();

    const alicePub = await crypto.exportPublicKey(alice.publicKey);
    const bobPub = await crypto.exportPublicKey(bob.publicKey);

    const aliceShared = await crypto.deriveSharedSecret(
      alice.privateKey,
      await crypto.importPublicKey(bobPub),
    );
    const bobShared = await crypto.deriveSharedSecret(
      bob.privateKey,
      await crypto.importPublicKey(alicePub),
    );

    const ciphertext = await crypto.encrypt('hello private world', aliceShared);
    const plaintext = await crypto.decrypt(ciphertext, bobShared);
    expect(plaintext).toBe('hello private world');
  });

  it('produces different ciphertexts for the same plaintext (random IV)', async () => {
    const alice = await crypto.generateKeyPair();
    const bob = await crypto.generateKeyPair();
    const shared = await crypto.deriveSharedSecret(
      alice.privateKey,
      await crypto.importPublicKey(await crypto.exportPublicKey(bob.publicKey)),
    );

    const a = await crypto.encrypt('same', shared);
    const b = await crypto.encrypt('same', shared);
    expect(a).not.toBe(b);
  });

  it('fails decrypt with the wrong shared key', async () => {
    const alice = await crypto.generateKeyPair();
    const bob = await crypto.generateKeyPair();
    const eve = await crypto.generateKeyPair();

    const aliceToBob = await crypto.deriveSharedSecret(
      alice.privateKey,
      await crypto.importPublicKey(await crypto.exportPublicKey(bob.publicKey)),
    );
    const eveKey = await crypto.deriveSharedSecret(
      eve.privateKey,
      await crypto.importPublicKey(await crypto.exportPublicKey(bob.publicKey)),
    );

    const ciphertext = await crypto.encrypt('secret', aliceToBob);
    await expect(crypto.decrypt(ciphertext, eveKey)).rejects.toThrow();
  });
});
