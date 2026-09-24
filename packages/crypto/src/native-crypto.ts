import * as ExpoCrypto from 'expo-crypto';
import Crypto from 'react-native-quick-crypto';
import type { ICryptoProvider, KeyPair } from './types.js';

const subtle = Crypto.subtle;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(base64: string): ArrayBuffer {
  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/**
 * React Native crypto provider using react-native-quick-crypto.
 *
 * Implements ECDH P-256 key exchange and AES-GCM encryption compatible with Web Crypto API.
 */
export class NativeCryptoProvider implements ICryptoProvider {
  async generateKeyPair(): Promise<KeyPair> {
    const keyPair = await (subtle.generateKey as any)(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey', 'deriveBits'],
    );
    return keyPair as KeyPair;
  }

  async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const spki = await (subtle.exportKey as any)('spki', publicKey);
    return toBase64(spki as ArrayBuffer);
  }

  async importPublicKey(spkiBase64: string): Promise<CryptoKey> {
    const spki = fromBase64(spkiBase64);
    return (subtle.importKey as any)('spki', spki, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
  }

  async deriveSharedSecret(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
    const derivedBits = await (subtle.deriveBits as any)(
      { name: 'ECDH', public: peerPublicKey },
      privateKey,
      256,
    );

    return (subtle.importKey as any)(
      'raw',
      Buffer.from(derivedBits),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  async encrypt(plaintext: string, sharedKey: CryptoKey): Promise<string> {
    const iv = ExpoCrypto.getRandomBytes(12);
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await (subtle.encrypt as any)(
      { name: 'AES-GCM', iv: Buffer.from(iv) },
      sharedKey,
      Buffer.from(encoded),
    );

    const packed = new Uint8Array(iv.length + ciphertext.byteLength);
    packed.set(new Uint8Array(iv), 0);
    packed.set(new Uint8Array(ciphertext), iv.length);
    return toBase64(packed.buffer);
  }

  async decrypt(ciphertext: string, sharedKey: CryptoKey): Promise<string> {
    const packed = new Uint8Array(fromBase64(ciphertext));
    const iv = packed.slice(0, 12);
    const data = packed.slice(12);

    const decrypted = await (subtle.decrypt as any)(
      { name: 'AES-GCM', iv: Buffer.from(iv) },
      sharedKey,
      Buffer.from(data),
    );
    return new TextDecoder().decode(decrypted);
  }

  async generateFingerprint(publicKeyBase64: string): Promise<string> {
    const keyBytes = fromBase64(publicKeyBase64);
    const hashArray = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      toBase64(keyBytes),
      { encoding: ExpoCrypto.CryptoEncoding.BASE64 },
    );

    const hashBytes = fromBase64(hashArray);
    const hashHex = Array.from(new Uint8Array(hashBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const groups = hashHex.match(/.{1,4}/g) || [];
    return groups.slice(0, 8).join(' ');
  }
}

export function createNativeCryptoProvider(): ICryptoProvider {
  return new NativeCryptoProvider();
}
