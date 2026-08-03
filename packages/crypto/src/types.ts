export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface ExportedKeyPair {
  publicKey: string;
  privateKey: CryptoKey;
}

/**
 * Abstraction for cryptographic operations.
 * Current implementation uses browser-native Web Crypto API.
 * Future providers (e.g. libsodium) can implement this interface.
 */
export interface ICryptoProvider {
  generateKeyPair(): Promise<KeyPair>;
  exportPublicKey(publicKey: CryptoKey): Promise<string>;
  importPublicKey(spkiBase64: string): Promise<CryptoKey>;
  deriveSharedSecret(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey>;
  encrypt(plaintext: string, sharedKey: CryptoKey): Promise<string>;
  decrypt(ciphertext: string, sharedKey: CryptoKey): Promise<string>;
}
