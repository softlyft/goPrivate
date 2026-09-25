import { p256 } from '@noble/curves/p256';

/**
 * Web Crypto ECDH P-256 deriveBits(256) is the shared point's X coordinate
 * (32 bytes). noble getSharedSecret returns 04||X||Y when uncompressed.
 */
export function ecdhP256SharedX(
  privateScalar: Uint8Array,
  peerUncompressed: Uint8Array,
): Uint8Array {
  const point = p256.getSharedSecret(privateScalar, peerUncompressed, false);
  if (point[0] === 0x04 && point.length >= 65) {
    return point.slice(1, 33);
  }
  if (point.length >= 32) {
    return point.slice(point.length - 32);
  }
  throw new Error('Invalid ECDH shared secret');
}

export function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** SEC1 ECPrivateKey version=1 followed by a 32-byte OCTET STRING. */
export function p256ScalarFromPkcs8(der: Uint8Array): Uint8Array {
  for (let i = 0; i < der.length - 36; i++) {
    if (
      der[i] === 0x02 &&
      der[i + 1] === 0x01 &&
      der[i + 2] === 0x01 &&
      der[i + 3] === 0x04 &&
      der[i + 4] === 0x20
    ) {
      return der.slice(i + 5, i + 37);
    }
  }
  throw new Error('Could not extract P-256 private scalar from PKCS#8');
}
