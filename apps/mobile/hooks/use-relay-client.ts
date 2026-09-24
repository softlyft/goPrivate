import { useEffect, useRef } from 'react';
import { createRelayClient, type IRelayClient } from '@goprivate/sdk';
import { getRelayUrl } from '../utils/env';

/**
 * Singleton relay client for the mobile app
 *
 * This matches the web app's pattern of reusing a single client instance
 * instead of creating a new one on each component mount.
 */
let clientSingleton: IRelayClient | null = null;

export function getRelayClient(): IRelayClient {
  if (!clientSingleton) {
    console.log('[useRelayClient] Creating new singleton relay client');
    clientSingleton = createRelayClient();
  }
  return clientSingleton;
}

export function resetRelayClient(): void {
  console.log('[useRelayClient] Resetting relay client singleton');
  if (clientSingleton) {
    try {
      clientSingleton.disconnect();
    } catch (err) {
      console.warn('[useRelayClient] Error disconnecting client:', err);
    }
  }
  clientSingleton = null;
}

/**
 * Hook to get the relay client instance
 *
 * Returns a singleton client that persists across component mounts.
 * This prevents recreating WebSocket connections unnecessarily.
 */
export function useRelayClient() {
  const clientRef = useRef<IRelayClient | null>(null);

  useEffect(() => {
    clientRef.current = getRelayClient();
    console.log('[useRelayClient] Got relay client, connected:', clientRef.current.connected);
  }, []);

  return clientRef.current || getRelayClient();
}

/**
 * Connect to relay if not already connected
 */
export async function ensureConnected(): Promise<IRelayClient> {
  const client = getRelayClient();

  if (
    client.status === 'disconnected' ||
    client.status === 'error' ||
    client.status === 'expired'
  ) {
    console.log('[useRelayClient] Connecting to relay...', getRelayUrl());
    await client.connect(getRelayUrl());
  } else {
    console.log('[useRelayClient] Already connected, status:', client.status);
  }

  return client;
}
