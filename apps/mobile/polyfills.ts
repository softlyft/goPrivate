import * as ExpoCrypto from 'expo-crypto';

/**
 * Hermes does not provide Web Crypto. The SDK and Subtle implementations
 * call getRandomValues / randomUUID on PIN setup and session create.
 */
function ensureWebCrypto(): void {
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

ensureWebCrypto();
