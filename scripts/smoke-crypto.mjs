import { createCryptoProvider } from '../packages/crypto/dist/index.js';

const crypto = createCryptoProvider();

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

if (plaintext !== 'hello private world') {
  throw new Error(`decrypt mismatch: ${plaintext}`);
}

console.log('✓ ECDH + AES-GCM roundtrip passed');
