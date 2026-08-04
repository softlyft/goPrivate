'use client';

import { useEffect } from 'react';
import { createRelayClient, type IRelayClient } from '@goprivate/sdk';
import { messageVault } from '@/services/vault';
import { useSessionStore } from '@/store/session';
import { getRelayUrl, getShareUrl } from '@/utils/env';

let clientSingleton: IRelayClient | null = null;
let wired = false;
let lifecycleBound = false;
let resumeTimer: ReturnType<typeof setTimeout> | null = null;
let resumeInFlight: Promise<void> | null = null;

function getClient(): IRelayClient {
  if (!clientSingleton) {
    clientSingleton = createRelayClient();
  }
  return clientSingleton;
}

async function ingestPlaintextMessage(message: {
  id: string;
  text: string;
  timestamp: number;
  fromPeer: boolean;
}): Promise<void> {
  if (!messageVault.isUnlocked) {
    useSessionStore.getState().setError('Vault is locked — cannot store message securely');
    return;
  }
  const encryptedText = await messageVault.encrypt(message.text);
  useSessionStore.getState().addMessage({
    id: message.id,
    encryptedText,
    timestamp: message.timestamp,
    fromPeer: message.fromPeer,
  });
}

function wireClient(client: IRelayClient): void {
  client.on('status', (status) => {
    useSessionStore.getState().setStatus(status);
    // Auto-resume when the socket drops while the tab is still visible
    if (status === 'disconnected' && typeof document !== 'undefined') {
      if (document.visibilityState === 'visible') {
        scheduleResume(400);
      }
    }
  });

  client.on('sessionCreated', (sessionId, expiresAt) => {
    useSessionStore.getState().setSessionId(sessionId);
    useSessionStore.getState().setShareUrl(getShareUrl(sessionId));
    useSessionStore.getState().setExpiresAt(expiresAt);
  });

  client.on('partnerJoined', (expiresAt) => {
    useSessionStore.getState().setPartnerPresent(true);
    useSessionStore.getState().setExpiresAt(expiresAt);
    useSessionStore.getState().setError(null);
  });

  client.on('partnerLeft', () => {
    useSessionStore.getState().setPartnerPresent(false);
  });

  client.on('sessionExpired', () => {
    messageVault.lock();
    useSessionStore.getState().setStatus('expired');
    useSessionStore.getState().setError('This session has expired (15 minute limit).');
    useSessionStore.getState().setExpiresAt(null);
    useSessionStore.getState().clearVault();
  });

  client.on('message', (message) => {
    void ingestPlaintextMessage(message);
  });

  client.on('error', (code, message) => {
    if (code === 'SESSION_NOT_FOUND') {
      // Handled by reconnect/join callers
      return;
    }
    useSessionStore.getState().setError(message);
    if (code === 'SESSION_EXPIRED') {
      messageVault.lock();
      useSessionStore.getState().setStatus('expired');
      useSessionStore.getState().clearVault();
    }
  });
}

function scheduleResume(delayMs = 0): void {
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => {
    resumeTimer = null;
    void resumeSession();
  }, delayMs);
}

async function resumeSession(): Promise<void> {
  if (resumeInFlight) return resumeInFlight;

  const store = useSessionStore.getState();
  const client = clientSingleton;
  if (!client) return;
  if (!store.sessionId && !client.sessionId) return;
  if (store.status === 'expired') return;
  if (!messageVault.isUnlocked) return;

  // Socket still open and session healthy — nothing to do
  if (
    client.connected &&
    (store.status === 'ready' ||
      store.status === 'awaiting_partner' ||
      store.status === 'handshaking')
  ) {
    return;
  }
  if (store.status === 'connecting' && client.connected) return;

  resumeInFlight = (async () => {
    try {
      store.setError(null);
      store.setStatus('connecting');
      await client.reconnect();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reconnect';
      useSessionStore.getState().setError(message);
      useSessionStore.getState().setStatus('disconnected');
    } finally {
      resumeInFlight = null;
    }
  })();

  return resumeInFlight;
}

function bindLifecycle(): void {
  if (lifecycleBound || typeof window === 'undefined') return;
  lifecycleBound = true;

  const onResume = () => scheduleResume(150);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onResume();
  });
  window.addEventListener('pageshow', onResume);
  window.addEventListener('online', onResume);
  window.addEventListener('focus', onResume);
}

export function useChatSession() {
  const store = useSessionStore();

  useEffect(() => {
    bindLifecycle();
  }, []);

  async function ensureConnected(): Promise<IRelayClient> {
    const client = getClient();
    if (!wired) {
      wireClient(client);
      wired = true;
    }
    bindLifecycle();
    if (
      client.status === 'disconnected' ||
      client.status === 'error' ||
      client.status === 'expired'
    ) {
      await client.connect(getRelayUrl());
    }
    return client;
  }

  async function setupVault(pin: string): Promise<void> {
    const meta = await messageVault.setup(pin);
    store.setVaultMeta(meta);
    store.setVaultReady(true);
  }

  async function createSession(): Promise<string> {
    if (!messageVault.isUnlocked) {
      throw new Error('Set your reveal PIN before creating a session');
    }
    store.reset();
    const client = await ensureConnected();
    const sessionId = await client.createSession();
    store.setSessionId(sessionId);
    store.setShareUrl(getShareUrl(sessionId));
    if (client.expiresAt) {
      store.setExpiresAt(client.expiresAt);
    }
    return sessionId;
  }

  async function joinSession(sessionId: string): Promise<void> {
    if (!messageVault.isUnlocked) {
      throw new Error('Set your reveal PIN before joining a session');
    }
    store.reset();
    store.setSessionId(sessionId);
    const client = await ensureConnected();
    await client.joinSession(sessionId);
  }

  async function sendMessage(text: string): Promise<void> {
    const client = getClient();
    if (client.status !== 'ready') {
      await resumeSession();
    }
    await getClient().sendMessage(text);
  }

  async function leaveSession(): Promise<void> {
    try {
      const client = getClient();
      await client.leaveSession();
    } finally {
      clientSingleton = null;
      wired = false;
      messageVault.lock();
      store.reset();
      store.clearVault();
    }
  }

  /** Tear down the socket after TTL without wiping the expired UI state. */
  async function expireSession(): Promise<void> {
    try {
      const client = getClient();
      await client.leaveSession();
    } catch {
      try {
        getClient().disconnect();
      } catch {
        // ignore
      }
    } finally {
      clientSingleton = null;
      wired = false;
      messageVault.lock();
      useSessionStore.setState({
        status: 'expired',
        error: 'This session has expired (15 minute limit).',
        partnerPresent: false,
        expiresAt: null,
        vaultMeta: null,
        vaultReady: false,
        messages: [],
      });
    }
  }

  return {
    ...store,
    setupVault,
    createSession,
    joinSession,
    sendMessage,
    leaveSession,
    expireSession,
  };
}
