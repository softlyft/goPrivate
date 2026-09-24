import * as ExpoCrypto from 'expo-crypto';

/**
 * Hermes has no Web Crypto. Session create needs Subtle (ECDH / AES-GCM);
 * expo-crypto only covers getRandomValues / randomUUID.
 */
function installQuickCrypto(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const QuickCrypto = require('react-native-quick-crypto') as {
      install?: () => void;
      default?: { install?: () => void };
    };
    const install = QuickCrypto.install ?? QuickCrypto.default?.install;
    if (typeof install !== 'function') {
      return false;
    }
    install();
    return typeof globalThis.crypto?.subtle === 'object';
  } catch {
    return false;
  }
}

function ensureRandomFallback(): void {
  const current = globalThis.crypto as Crypto | undefined;

  const getRandomValues = <T extends ArrayBufferView>(typedArray: T): T =>
    ExpoCrypto.getRandomValues(typedArray as unknown as Uint8Array) as unknown as T;

  const randomUUID = (): `${string}-${string}-${string}-${string}-${string}` =>
    ExpoCrypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`;

  if (!current) {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { getRandomValues, randomUUID },
    });
    return;
  }

  if (typeof current.getRandomValues !== 'function') {
    current.getRandomValues = getRandomValues;
  }
  if (typeof current.randomUUID !== 'function') {
    current.randomUUID = randomUUID;
  }
}

if (!installQuickCrypto()) {
  ensureRandomFallback();
}
