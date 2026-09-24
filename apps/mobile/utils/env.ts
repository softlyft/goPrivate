const DEFAULT_PROD_RELAY = 'wss://goprivate-relay.onrender.com/ws';
const DEFAULT_DEV_RELAY = 'ws://10.0.2.2:3001/ws';

export function getRelayUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_RELAY_URL?.trim();
  if (fromEnv && isUsableRelayUrl(fromEnv)) {
    return fromEnv;
  }
  return __DEV__ ? DEFAULT_DEV_RELAY : DEFAULT_PROD_RELAY;
}

function isUsableRelayUrl(url: string): boolean {
  if (__DEV__) {
    return url.startsWith('ws://') || url.startsWith('wss://');
  }
  // Release APK / store builds always talk to a hosted relay.
  return url.startsWith('wss://');
}
