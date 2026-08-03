'use client';

import { createRelayClient, type IRelayClient } from '@goprivate/sdk';
import { messageVault } from '@/services/vault';
import { useSessionStore } from '@/store/session';
import { getRelayUrl, getShareUrl } from '@/utils/env';

let clientSingleton: IRelayClient | null = null;

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
  });

  client.on('sessionCreated', (sessionId, expiresAt) => {
    useSessionStore.getState().setSessionId(sessionId);
    useSessionStore.getState().setShareUrl(getShareUrl(sessionId));
    useSessionStore.getState().setExpiresAt(expiresAt);
  });

  client.on('partnerJoined', (expiresAt) => {
    useSessionStore.getState().setPartnerPresent(true);
    useSessionStore.getState().setExpiresAt(expiresAt);
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
    useSessionStore.getState().setError(message);
    if (code === 'SESSION_EXPIRED') {
      messageVault.lock();
      useSessionStore.getState().setStatus('expired');
      useSessionStore.getState().clearVault();
    }
  });
}

let wired = false;

export function useChatSession() {
  const store = useSessionStore();

  async function ensureConnected(): Promise<IRelayClient> {
    const client = getClient();
    if (!wired) {
      wireClient(client);
      wired = true;
    }
    if (client.status === 'disconnected' || client.status === 'error' || client.status === 'expired') {
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
    await client.sendMessage(text);
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

  return {
    ...store,
    setupVault,
    createSession,
    joinSession,
    sendMessage,
    leaveSession,
  };
}
