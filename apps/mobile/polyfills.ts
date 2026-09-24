<<<<<<< HEAD
/**
 * Polyfills required for React Native to work with goPrivate SDK
 *
 * This file MUST be imported at the very top of the app entry point
 * before any other imports that use crypto or Buffer.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// 1. Buffer global (required by @goprivate/crypto)
import { Buffer } from '@craftzdog/react-native-buffer';
if (typeof (globalThis as any).Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

// 2. Crypto global (required by react-native-quick-crypto)
import Crypto from 'react-native-quick-crypto';
if (typeof (globalThis as any).crypto === 'undefined') {
  (globalThis as any).crypto = Crypto;
}

// 3. TextEncoder/TextDecoder (if needed)
// React Native 0.64+ has these built-in, but just in case
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TextEncoder, TextDecoder } = require('text-encoding');
    (globalThis as any).TextEncoder = TextEncoder;
    (globalThis as any).TextDecoder = TextDecoder;
  } catch {
    // text-encoding not available, that's fine
  }
}

export {};
=======
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
>>>>>>> origin/main
