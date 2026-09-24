import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => new Uint8Array(n),
  digestStringAsync: async () => 'AAAA',
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { BASE64: 'base64' },
}));

vi.mock('react-native-quick-crypto', () => ({
  install: () => undefined,
  subtle: {},
}));

const { createCryptoProvider } = await import('./platform.native.js');
const { NativeCryptoProvider } = await import('./native-crypto.js');

describe('platform.native createCryptoProvider', () => {
  it('returns the native provider, not Web Crypto', () => {
    expect(createCryptoProvider()).toBeInstanceOf(NativeCryptoProvider);
  });
});
