import type { ICryptoProvider, KeyPair } from './types.js';

const ECDH_PARAMS: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' };
const AES_PARAMS: AesDerivedKeyParams = { name: 'AES-GCM', length: 256 };

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function fromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function getSubtle(): SubtleCrypto {
  if (typeof globalThis.crypto?.subtle === 'undefined') {
    throw new Error('Web Crypto API is not available in this environment');
  }
  return globalThis.crypto.subtle;
}

/**
 * Web Crypto API implementation of ICryptoProvider.
 * ECDH P-256 key exchange + AES-GCM encryption.
 */
export class WebCryptoProvider implements ICryptoProvider {
  async generateKeyPair(): Promise<KeyPair> {
    const pair = await getSubtle().generateKey(ECDH_PARAMS, true, ['deriveKey', 'deriveBits']);
    return {
      publicKey: pair.publicKey,
      privateKey: pair.privateKey,
    };
  }

  async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const spki = await getSubtle().exportKey('spki', publicKey);
    return toBase64(spki);
  }

  async importPublicKey(spkiBase64: string): Promise<CryptoKey> {
    return getSubtle().importKey('spki', fromBase64(spkiBase64), ECDH_PARAMS, true, []);
  }

  async deriveSharedSecret(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
    return getSubtle().deriveKey(
      { name: 'ECDH', public: peerPublicKey },
      privateKey,
      AES_PARAMS,
      false,
      ['encrypt', 'decrypt'],
    );
  }

  async encrypt(plaintext: string, sharedKey: CryptoKey): Promise<string> {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await getSubtle().encrypt({ name: 'AES-GCM', iv }, sharedKey, encoded);

    // Pack: iv (12 bytes) + ciphertext
    const packed = new Uint8Array(iv.length + ciphertext.byteLength);
    packed.set(iv, 0);
    packed.set(new Uint8Array(ciphertext), iv.length);
    return toBase64(packed.buffer);
  }

  async decrypt(ciphertext: string, sharedKey: CryptoKey): Promise<string> {
    const packed = new Uint8Array(fromBase64(ciphertext));
    const iv = packed.slice(0, 12);
    const data = packed.slice(12);
    const decrypted = await getSubtle().decrypt({ name: 'AES-GCM', iv }, sharedKey, data);
    return new TextDecoder().decode(decrypted);
  }
}

export function createCryptoProvider(): ICryptoProvider {
  return new WebCryptoProvider();
}
