/**
 * ECDSA P-256 lease keys for operator-issued handle ownership.
 * Web Crypto / quick-crypto on clients; Node crypto on the issue script and relay.
 */

const ECDSA_PARAMS: EcdsaParams & EcKeyGenParams = {
  name: 'ECDSA',
  namedCurve: 'P-256',
  hash: 'SHA-256',
};

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto is not available');
  }
  return subtle;
}

function toBase64(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const g = globalThis as {
    Buffer?: {
      from: (data: Uint8Array | string, enc?: string) => { toString: (enc: string) => string };
    };
    btoa?: (value: string) => string;
  };
  if (g.Buffer) {
    return g.Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  if (!g.btoa) {
    throw new Error('Base64 encoding is unavailable');
  }
  return g.btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const g = globalThis as {
    Buffer?: { from: (data: string, enc: string) => Uint8Array };
    atob?: (value: string) => string;
  };
  if (g.Buffer) {
    return new Uint8Array(g.Buffer.from(base64, 'base64'));
  }
  if (!g.atob) {
    throw new Error('Base64 decoding is unavailable');
  }
  const binary = g.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function asBufferSource(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function importLeasePrivateKey(pkcs8Base64: string): Promise<CryptoKey> {
  return getSubtle().importKey(
    'pkcs8',
    asBufferSource(fromBase64(pkcs8Base64)),
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign'],
  );
}

export async function exportLeasePublicKey(privateKey: CryptoKey): Promise<string> {
  const jwk = await getSubtle().exportKey('jwk', privateKey);
  const publicJwk: JsonWebKey = {
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
    y: jwk.y,
    ext: true,
    key_ops: ['verify'],
  };
  const publicKey = await getSubtle().importKey(
    'jwk',
    publicJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify'],
  );
  const spki = await getSubtle().exportKey('spki', publicKey);
  return toBase64(spki);
}

export async function signHandleClaim(privateKeyPkcs8: string, message: string): Promise<string> {
  const key = await importLeasePrivateKey(privateKeyPkcs8);
  const signature = await getSubtle().sign(ECDSA_PARAMS, key, new TextEncoder().encode(message));
  return toBase64(signature);
}

export function parseHandleLeasePaste(raw: string): {
  handle?: string;
  publicKey?: string;
  privateKey: string;
  expiresAt?: number;
} | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof parsed.privateKey === 'string' && parsed.privateKey.length > 0) {
      return {
        privateKey: parsed.privateKey,
        publicKey: typeof parsed.publicKey === 'string' ? parsed.publicKey : undefined,
        handle: typeof parsed.handle === 'string' ? parsed.handle : undefined,
        expiresAt: parseExpiresAt(parsed.expiresAt),
      };
    }
  } catch {
    // line-oriented lease block
  }

  const privateKey = matchField(trimmed, 'privateKey');
  if (!privateKey) {
    if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 80) {
      return { privateKey: trimmed };
    }
    return null;
  }
  return {
    privateKey,
    publicKey: matchField(trimmed, 'publicKey'),
    handle: matchField(trimmed, 'handle'),
    expiresAt: parseExpiresAt(matchField(trimmed, 'expiresAt')),
  };
}

function matchField(block: string, name: string): string | undefined {
  const match = block.match(new RegExp(`^${name}=(\\S+)`, 'im'));
  return match?.[1];
}

function parseExpiresAt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length > 0) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : undefined;
  }
  return undefined;
}
