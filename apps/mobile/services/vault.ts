/**
 * Mobile message vault — encrypts chat text at rest using SecureStore.
 *
 * - Random AES-256-GCM vault key (held only in this module, not Zustand)
 * - Vault key wrapped with a key derived from the 6-digit PIN (PBKDF2)
 * - Zustand / DevTools only ever see ciphertext + public vault metadata
 *
 * Uses expo-secure-store for secure key storage and react-native-quick-crypto for operations.
 */

import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';
import Crypto from 'react-native-quick-crypto';

const subtle = Crypto.subtle;

const PBKDF2_ITERATIONS_DEFAULT = 600_000;
let pbkdf2Iterations = PBKDF2_ITERATIONS_DEFAULT;

export function configureVaultForTests(options: { iterations?: number }): void {
  if (options.iterations !== undefined) {
    pbkdf2Iterations = options.iterations;
  }
}

export function resetVaultTestConfig(): void {
  pbkdf2Iterations = PBKDF2_ITERATIONS_DEFAULT;
}

const WRAP_IV_LENGTH = 12;
const MSG_IV_LENGTH = 12;
const VAULT_META_KEY = 'goprivate_vault_meta';

export interface VaultMeta {
  salt: string;
  wrappedKey: string;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(base64: string): ArrayBuffer {
  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function derivePinKey(pin: string, salt: ArrayBuffer): Promise<any> {
  const material = await (subtle.importKey as any)(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return (subtle.deriveKey as any)(
    {
      name: 'PBKDF2',
      salt: Buffer.from(salt),
      iterations: pbkdf2Iterations,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function wrapVaultKey(vaultKey: any, pinKey: any): Promise<string> {
  const raw = await (subtle.exportKey as any)('raw', vaultKey);
  const iv = ExpoCrypto.getRandomBytes(WRAP_IV_LENGTH);
  const sealed = await (subtle.encrypt as any)({ name: 'AES-GCM', iv: Buffer.from(iv) }, pinKey, Buffer.from(raw));
  const packed = new Uint8Array(iv.length + sealed.byteLength);
  packed.set(new Uint8Array(iv), 0);
  packed.set(new Uint8Array(sealed), iv.length);
  return toBase64(packed.buffer);
}

async function unwrapVaultKey(wrappedKey: string, pinKey: any): Promise<any> {
  const packed = new Uint8Array(fromBase64(wrappedKey));
  const iv = packed.slice(0, WRAP_IV_LENGTH);
  const data = packed.slice(WRAP_IV_LENGTH);
  const raw = await (subtle.decrypt as any)({ name: 'AES-GCM', iv: Buffer.from(iv) }, pinKey, Buffer.from(data));
  return (subtle.importKey as any)('raw', raw, { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

class MessageVault {
  private vaultKey: any = null;
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

  async setup(pin: string): Promise<VaultMeta> {
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('PIN must be 6 digits');
    }
    const salt = ExpoCrypto.getRandomBytes(16);
    const pinKey = await derivePinKey(pin, salt.buffer);
    const vaultKey = await (subtle.generateKey as any)({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    const wrappedKey = await wrapVaultKey(vaultKey, pinKey);
    this.vaultKey = vaultKey;
    this.meta = { salt: toBase64(salt.buffer), wrappedKey };
    this.failedAttempts = 0;
    this.lockUntil = 0;

    await SecureStore.setItemAsync(VAULT_META_KEY, JSON.stringify(this.meta));
    return this.meta;
  }

  async unlock(pin: string, meta?: VaultMeta): Promise<boolean> {
    if (Date.now() < this.lockUntil) {
      throw new Error('Too many attempts. Wait a moment and try again.');
    }

    let useMeta = meta ?? this.meta;
    if (!useMeta) {
      const storedMeta = await SecureStore.getItemAsync(VAULT_META_KEY);
      if (storedMeta) {
        useMeta = JSON.parse(storedMeta);
      } else {
        return false;
      }
    }

    if (!/^\d{6}$/.test(pin)) return false;

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

  async lock(): Promise<void> {
    this.vaultKey = null;
    this.meta = null;
    this.failedAttempts = 0;
    this.lockUntil = 0;
  }

  async clearVault(): Promise<void> {
    await this.lock();
    await SecureStore.deleteItemAsync(VAULT_META_KEY);
  }

  async encrypt(plaintext: string): Promise<string> {
    if (!this.vaultKey) throw new Error('Vault is locked');
    const iv = ExpoCrypto.getRandomBytes(MSG_IV_LENGTH);
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await (subtle.encrypt as any)(
      { name: 'AES-GCM', iv: Buffer.from(iv) },
      this.vaultKey,
      Buffer.from(encoded),
    );
    const packed = new Uint8Array(iv.length + ciphertext.byteLength);
    packed.set(new Uint8Array(iv), 0);
    packed.set(new Uint8Array(ciphertext), iv.length);
    return toBase64(packed.buffer);
  }

  async decrypt(ciphertext: string): Promise<string> {
    if (!this.vaultKey) throw new Error('Vault is locked');
    const packed = new Uint8Array(fromBase64(ciphertext));
    const iv = packed.slice(0, MSG_IV_LENGTH);
    const data = packed.slice(MSG_IV_LENGTH);
    const decrypted = await (subtle.decrypt as any)(
      { name: 'AES-GCM', iv: Buffer.from(iv) },
      this.vaultKey,
      Buffer.from(data),
    );
    return new TextDecoder().decode(decrypted);
  }
}

export const messageVault = new MessageVault();
