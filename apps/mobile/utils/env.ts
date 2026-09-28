import { DEFAULT_ANDROID_EMULATOR_RELAY_URL, DEFAULT_PROD_RELAY_URL } from '@goprivate/config';

export function getRelayUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_RELAY_URL?.trim();
  if (fromEnv && isUsableRelayUrl(fromEnv)) {
    return fromEnv;
  }
  return __DEV__ ? DEFAULT_ANDROID_EMULATOR_RELAY_URL : DEFAULT_PROD_RELAY_URL;
}

export function getHandleClaimSecret(): string | undefined {
  const value = process.env.EXPO_PUBLIC_HANDLE_CLAIM_SECRET?.trim();
  return value ? value : undefined;
}

function isUsableRelayUrl(url: string): boolean {
  if (__DEV__) {
    return url.startsWith('ws://') || url.startsWith('wss://');
  }
  // Release APK / store builds always talk to a hosted relay.
  return url.startsWith('wss://');
}
