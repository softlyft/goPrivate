import { Buffer } from 'buffer';
import * as ExpoCrypto from 'expo-crypto';
import { ecdhP256SharedX, fromBase64Url, p256ScalarFromPkcs8 } from './ecdh-shared.js';
import { rawToSpki, spkiToRaw } from './ec-spki.js';
import type { ICryptoProvider, KeyPair } from './types.js';

// Expo Go does not ship this native module; a development build is required.
type QuickCryptoLike = {
  subtle?: SubtleCrypto;
  webcrypto?: { subtle?: SubtleCrypto };
  default?: {
    subtle?: SubtleCrypto;
    webcrypto?: { subtle?: SubtleCrypto };
  };
};

let subtle: SubtleCrypto | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Crypto = require('react-native-quick-crypto') as QuickCryptoLike;
  const qc = Crypto.default ?? Crypto;
  subtle = qc.subtle ?? qc.webcrypto?.subtle;
} catch {
  subtle = undefined;
}

function requireSubtle(): SubtleCrypto {
  if (!subtle) {
    throw new Error(
      'Native crypto is not available in Expo Go. Use a development build (npx expo run:android).',
    );
  }
  return subtle;
}

function copyBytes(data: ArrayBuffer | Uint8Array): Uint8Array {
  const view = data instanceof Uint8Array ? data : new Uint8Array(data);
  return new Uint8Array(view);
}

function toBase64(data: ArrayBuffer | Uint8Array): string {
  return Buffer.from(copyBytes(data)).toString('base64');
}

function fromBase64(base64: string): Uint8Array {
  return copyBytes(Buffer.from(base64, 'base64'));
}

async function exportP256Scalar(
  subtleApi: SubtleCrypto,
  privateKey: CryptoKey,
): Promise<Uint8Array> {
  try {
    const jwk = (await (subtleApi.exportKey as any)('jwk', privateKey)) as JsonWebKey;
    if (jwk.d) {
      return fromBase64Url(jwk.d);
    }
  } catch {
    // quick-crypto JWK export can fail; PKCS#8 is implemented for ECDH.
  }
  const pkcs8 = copyBytes(
    (await (subtleApi.exportKey as any)('pkcs8', privateKey)) as ArrayBuffer | Uint8Array,
  );
  return p256ScalarFromPkcs8(pkcs8);
}

/**
 * React Native crypto provider using react-native-quick-crypto.
 *
 * Implements ECDH P-256 key exchange and AES-GCM encryption compatible with Web Crypto API.
 */
export class NativeCryptoProvider implements ICryptoProvider {
  async generateKeyPair(): Promise<KeyPair> {
    const keyPair = await (requireSubtle().generateKey as any)(
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
    const raw = await (requireSubtle().exportKey as any)('raw', publicKey);
    return toBase64(rawToSpki(copyBytes(raw as ArrayBuffer | Uint8Array)));
  }

  async importPublicKey(spkiBase64: string): Promise<CryptoKey> {
    const raw = spkiToRaw(fromBase64(spkiBase64));
    return (requireSubtle().importKey as any)(
      'raw',
      raw,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    );
  }

  async deriveSharedSecret(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
    // quick-crypto 0.7 stubs subtle.deriveBits for ECDH. Compute the same
    // 32-byte X coordinate Web Crypto returns, then import it as AES-GCM.
    const scalar = await exportP256Scalar(requireSubtle(), privateKey);
    const peerRaw = copyBytes(
      (await (requireSubtle().exportKey as any)('raw', peerPublicKey)) as ArrayBuffer | Uint8Array,
    );
    const sharedX = ecdhP256SharedX(scalar, peerRaw);

    return (requireSubtle().importKey as any)(
      'raw',
      sharedX,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  async encrypt(plaintext: string, sharedKey: CryptoKey): Promise<string> {
    const iv = ExpoCrypto.getRandomBytes(12);
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await (requireSubtle().encrypt as any)(
      { name: 'AES-GCM', iv: Buffer.from(iv) },
      sharedKey,
      Buffer.from(encoded),
    );

    const packed = new Uint8Array(iv.length + ciphertext.byteLength);
    packed.set(new Uint8Array(iv), 0);
    packed.set(new Uint8Array(ciphertext), iv.length);
    return toBase64(packed);
  }

  async decrypt(ciphertext: string, sharedKey: CryptoKey): Promise<string> {
    const packed = fromBase64(ciphertext);
    const iv = packed.slice(0, 12);
    const data = packed.slice(12);

    const decrypted = await (requireSubtle().decrypt as any)(
      { name: 'AES-GCM', iv: Buffer.from(iv) },
      sharedKey,
      Buffer.from(data),
    );
    return new TextDecoder().decode(decrypted);
  }

  async generateFingerprint(publicKeyBase64: string): Promise<string> {
    const keyBytes = fromBase64(publicKeyBase64);
    const hashBuffer = await (
      requireSubtle().digest as (alg: string, data: Uint8Array) => Promise<ArrayBuffer>
    )('SHA-256', keyBytes);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const groups = hashHex.match(/.{1,4}/g) || [];
    return groups.slice(0, 8).join(' ');
  }
}

export function createNativeCryptoProvider(): ICryptoProvider {
  return new NativeCryptoProvider();
}
