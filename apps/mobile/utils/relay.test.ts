import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { NativeCryptoProvider } from '@goprivate/crypto/native';

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

const createRelayClient = vi.fn((options: { crypto?: unknown }) => ({ options }));

vi.mock('@goprivate/sdk', () => ({
  createRelayClient: (options: { crypto?: unknown }) => createRelayClient(options),
}));

const { createMobileRelayClient } = await import('./relay');

describe('createMobileRelayClient', () => {
  it('injects the native crypto provider', () => {
    createMobileRelayClient();
    expect(createRelayClient).toHaveBeenCalledTimes(1);
    const options = createRelayClient.mock.calls[0]?.[0] as { crypto?: unknown };
    expect(options.crypto).toBeInstanceOf(NativeCryptoProvider);
  });
});

describe('mobile screens do not construct a web-crypto relay client', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const files = ['app/index.tsx', 'app/chat/[sessionId].tsx', 'app/join.tsx'];

  it.each(files)('%s does not call createRelayClient(', (file) => {
    const src = readFileSync(path.join(root, file), 'utf8');
    expect(src).not.toMatch(/createRelayClient\s*\(/);
  });
});
