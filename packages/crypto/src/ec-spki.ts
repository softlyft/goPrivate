/**
 * P-256 SubjectPublicKeyInfo (SPKI) ↔ uncompressed raw point.
 * react-native-quick-crypto 0.7 only imports EC keys as `raw` / `jwk`
 * (`spki` is commented out). The wire format stays SPKI so Web Crypto
 * can import keys from the mobile client.
 */

const P256_SPKI_PREFIX = Uint8Array.from([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
  0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00,
]);

const RAW_LEN = 65;
const SPKI_LEN = P256_SPKI_PREFIX.length + RAW_LEN;

function startsWith(bytes: Uint8Array, prefix: Uint8Array): boolean {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) return false;
  }
  return true;
}

export function rawToSpki(raw: Uint8Array): Uint8Array {
  if (raw.length !== RAW_LEN || raw[0] !== 0x04) {
    throw new Error('Expected uncompressed P-256 public key (65-byte raw)');
  }
  const spki = new Uint8Array(SPKI_LEN);
  spki.set(P256_SPKI_PREFIX, 0);
  spki.set(raw, P256_SPKI_PREFIX.length);
  return spki;
}

export function spkiToRaw(spki: Uint8Array): Uint8Array {
  if (spki.length === RAW_LEN && spki[0] === 0x04) {
    return new Uint8Array(spki);
  }

  if (spki.length === SPKI_LEN && startsWith(spki, P256_SPKI_PREFIX)) {
    return spki.slice(P256_SPKI_PREFIX.length);
  }

  const pointOffset = spki.length - RAW_LEN;
  if (pointOffset >= 0 && spki[pointOffset] === 0x04) {
    return spki.slice(pointOffset);
  }

  throw new Error('Unsupported EC public key encoding');
}
