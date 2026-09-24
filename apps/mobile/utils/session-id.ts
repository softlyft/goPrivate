import * as ExpoCrypto from 'expo-crypto';

/** 32-char hex session id, same shape the SDK uses for CREATE_SESSION. */
export function generateSessionId(): string {
  const bytes = ExpoCrypto.getRandomBytes(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
