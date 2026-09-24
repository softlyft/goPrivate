const DEFAULT_PROD_RELAY = 'wss://goprivate-relay.onrender.com/ws';
const DEFAULT_DEV_RELAY = 'ws://10.0.2.2:3001/ws';

export function getRelayUrl(): string {
  return process.env.EXPO_PUBLIC_RELAY_URL ?? (__DEV__ ? DEFAULT_DEV_RELAY : DEFAULT_PROD_RELAY);
}
