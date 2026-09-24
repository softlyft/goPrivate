import * as ExpoCrypto from 'expo-crypto';
import type { ICryptoProvider, KeyPair } from './types.js';

// React Native doesn't have Web Crypto API, so we need platform-specific implementation
// Using expo-crypto for random bytes and hashing
// For now, this is a placeholder - full ECDH implementation would need react-native-quick-crypto

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  // In React Native, btoa might not be available, use Buffer or base64 library
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  }
  // Fallback for RN
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(base64: string): ArrayBuffer {
  // In React Native, atob might not be available
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  // Fallback for RN
  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/**
 * React Native crypto provider using expo-crypto.
 *
 * Note: This is a simplified implementation for Phase 1.
 * For production, you should use react-native-quick-crypto or @noble/ciphers
 * for full ECDH P-256 support.
 */
export class NativeCryptoProvider implements ICryptoProvider {
  async generateKeyPair(): Promise<KeyPair> {
    // TODO: Implement with react-native-quick-crypto
    // For now, throw to catch during development
    throw new Error(
      'Native ECDH key generation not yet implemented. Use react-native-quick-crypto.',
    );
  }

  async exportPublicKey(_publicKey: CryptoKey): Promise<string> {
    throw new Error('Native key export not yet implemented.');
  }

  async importPublicKey(_spkiBase64: string): Promise<CryptoKey> {
    throw new Error('Native key import not yet implemented.');
  }

  async deriveSharedSecret(_privateKey: CryptoKey, _peerPublicKey: CryptoKey): Promise<CryptoKey> {
    throw new Error('Native key derivation not yet implemented.');
  }

  async encrypt(_plaintext: string, _sharedKey: CryptoKey): Promise<string> {
    throw new Error('Native encryption not yet implemented.');
  }

  async decrypt(_ciphertext: string, _sharedKey: CryptoKey): Promise<string> {
    throw new Error('Native decryption not yet implemented.');
  }

  async generateFingerprint(publicKeyBase64: string): Promise<string> {
    // This we can implement with expo-crypto's digest function
    const keyBytes = fromBase64(publicKeyBase64);
    const hashArray = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      toBase64(keyBytes),
      { encoding: ExpoCrypto.CryptoEncoding.BASE64 },
    );

    // Convert to hex and format
    const hashBytes = fromBase64(hashArray);
    const hashHex = Array.from(new Uint8Array(hashBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Format as 8 groups of 4 characters
    const groups = hashHex.match(/.{1,4}/g) || [];
    return groups.slice(0, 8).join(' ');
  }
}

export function createNativeCryptoProvider(): ICryptoProvider {
  return new NativeCryptoProvider();
}
