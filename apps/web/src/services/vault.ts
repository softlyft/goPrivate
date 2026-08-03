/**
 * Local message vault — encrypts chat text at rest in the browser.
 *
 * - Random AES-256-GCM vault key (held only in this module, not Zustand)
 * - Vault key wrapped with a key derived from the 4-digit PIN (PBKDF2)
 * - Zustand / DevTools only ever see ciphertext + public vault metadata
 *
 * Note: a 4-digit PIN has a small search space. High PBKDF2 iterations slow
 * offline guessing; the UI also rate-limits PIN attempts.
 */

const PBKDF2_ITERATIONS = 600_000;
const WRAP_IV_LENGTH = 12;
const MSG_IV_LENGTH = 12;

export interface VaultMeta {
  salt: string;
  wrappedKey: string;
}

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

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API unavailable');
  }
  return globalThis.crypto.subtle;
}

async function derivePinKey(pin: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const material = await subtle().importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return subtle().deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function wrapVaultKey(vaultKey: CryptoKey, pinKey: CryptoKey): Promise<string> {
  const raw = await subtle().exportKey('raw', vaultKey);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(WRAP_IV_LENGTH));
  const sealed = await subtle().encrypt({ name: 'AES-GCM', iv }, pinKey, raw);
  const packed = new Uint8Array(iv.length + sealed.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(sealed), iv.length);
  return toBase64(packed.buffer);
}

async function unwrapVaultKey(wrappedKey: string, pinKey: CryptoKey): Promise<CryptoKey> {
  const packed = new Uint8Array(fromBase64(wrappedKey));
  const iv = packed.slice(0, WRAP_IV_LENGTH);
  const data = packed.slice(WRAP_IV_LENGTH);
  const raw = await subtle().decrypt({ name: 'AES-GCM', iv }, pinKey, data);
  return subtle().importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

class MessageVault {
  private vaultKey: CryptoKey | null = null;
  private meta: VaultMeta | null = null;
  private failedAttempts = 0;
  private lockUntil = 0;

  get isUnlocked(): boolean {
    return this.vaultKey !== null;
  }

  get hasVault(): boolean {
    return this.meta !== null;
  }

  getMeta(): VaultMeta | null {
    return this.meta;
  }

  /** Create a new vault from a PIN. Keeps the vault unlocked in this module. */
  async setup(pin: string): Promise<VaultMeta> {
    if (!/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be 4 digits');
    }
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const pinKey = await derivePinKey(pin, salt.buffer);
    const vaultKey = await subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    const wrappedKey = await wrapVaultKey(vaultKey, pinKey);
    this.vaultKey = vaultKey;
    this.meta = { salt: toBase64(salt.buffer), wrappedKey };
    this.failedAttempts = 0;
    this.lockUntil = 0;
    return this.meta;
  }

  /** Unlock an existing vault with PIN. Returns false if PIN is wrong. */
  async unlock(pin: string, meta?: VaultMeta): Promise<boolean> {
    if (Date.now() < this.lockUntil) {
      throw new Error('Too many attempts. Wait a moment and try again.');
    }
    const useMeta = meta ?? this.meta;
    if (!useMeta) return false;
    if (!/^\d{4}$/.test(pin)) return false;

    try {
      const pinKey = await derivePinKey(pin, fromBase64(useMeta.salt));
      const vaultKey = await unwrapVaultKey(useMeta.wrappedKey, pinKey);
      this.vaultKey = vaultKey;
      this.meta = useMeta;
      this.failedAttempts = 0;
      return true;
    } catch {
      this.failedAttempts += 1;
      if (this.failedAttempts >= 5) {
        this.lockUntil = Date.now() + 30_000;
        this.failedAttempts = 0;
      }
      return false;
    }
  }

  /** Verify PIN without changing unlock state if already unlocked with same vault. */
  async verifyPin(pin: string): Promise<boolean> {
    if (!this.meta) return false;
    if (Date.now() < this.lockUntil) {
      throw new Error('Too many attempts. Wait a moment and try again.');
    }
    try {
      const pinKey = await derivePinKey(pin, fromBase64(this.meta.salt));
      await unwrapVaultKey(this.meta.wrappedKey, pinKey);
      this.failedAttempts = 0;
      return true;
    } catch {
      this.failedAttempts += 1;
      if (this.failedAttempts >= 5) {
        this.lockUntil = Date.now() + 30_000;
        this.failedAttempts = 0;
      }
      return false;
    }
  }

  lock(): void {
    this.vaultKey = null;
    this.meta = null;
    this.failedAttempts = 0;
    this.lockUntil = 0;
  }

  async encrypt(plaintext: string): Promise<string> {
    if (!this.vaultKey) throw new Error('Vault is locked');
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(MSG_IV_LENGTH));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await subtle().encrypt({ name: 'AES-GCM', iv }, this.vaultKey, encoded);
    const packed = new Uint8Array(iv.length + ciphertext.byteLength);
    packed.set(iv, 0);
    packed.set(new Uint8Array(ciphertext), iv.length);
    return toBase64(packed.buffer);
  }

  async decrypt(ciphertext: string): Promise<string> {
    if (!this.vaultKey) throw new Error('Vault is locked');
    const packed = new Uint8Array(fromBase64(ciphertext));
    const iv = packed.slice(0, MSG_IV_LENGTH);
    const data = packed.slice(MSG_IV_LENGTH);
    const decrypted = await subtle().decrypt({ name: 'AES-GCM', iv }, this.vaultKey, data);
    return new TextDecoder().decode(decrypted);
  }
}

/** Singleton vault — key material stays outside React/Zustand. */
export const messageVault = new MessageVault();
