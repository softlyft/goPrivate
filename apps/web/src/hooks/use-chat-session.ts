'use client';

import { useEffect, useState } from 'react';
import { ChatHub, type ChatSnapshot, type IRelayClient } from '@goprivate/sdk';
import { messageVault } from '@/services/vault';
import { listChats, useSessionStore } from '@/store/session';
import { getHandleClaimSecret, getRelayUrl, getShareUrl } from '@/utils/env';
import { createHandleProof, savePreferredHandle } from '@/services/handle-lease';

let hubSingleton: ChatHub | null = null;
let wired = false;
let lifecycleBound = false;
let resumeTimer: ReturnType<typeof setTimeout> | null = null;
let resumeInFlight: Promise<void> | null = null;

export function getChatHub(): ChatHub {
  if (!hubSingleton) {
    hubSingleton = new ChatHub({
      getRelayUrl,
      getClaimSecret: getHandleClaimSecret,
      getHandleProof: (handle) => createHandleProof(handle),
    });
  }
  return hubSingleton;
}

function applySnapshot(sessionId: string, snapshot: ChatSnapshot): void {
  useSessionStore.getState().upsertChat(sessionId, {
    isHost: snapshot.isHost,
    status: snapshot.status,
    expiresAt: snapshot.expiresAt,
    partnerPresent: snapshot.partnerPresent,
    error: snapshot.error,
    shareUrl: getShareUrl(sessionId),
  });
}

async function ingestPlaintextMessage(
  sessionId: string,
  message: {
    id: string;
    text: string;
    timestamp: number;
    fromPeer: boolean;
  },
): Promise<void> {
  if (!messageVault.isUnlocked) {
    useSessionStore.getState().upsertChat(sessionId, {
      error: 'Vault is locked — cannot store message securely',
    });
    return;
  }
  const encryptedText = await messageVault.encrypt(message.text);
  useSessionStore.getState().addMessage(sessionId, {
    id: message.id,
    encryptedText,
    timestamp: message.timestamp,
    fromPeer: message.fromPeer,
  });
}

function wireHub(hub: ChatHub): void {
  hub.on('snapshot', (sessionId, snapshot) => {
    applySnapshot(sessionId, snapshot);
  });

  hub.on('message', (sessionId, message) => {
    void ingestPlaintextMessage(sessionId, message);
  });

  hub.on('fingerprints', (sessionId, local, peer) => {
    useSessionStore.getState().upsertChat(sessionId, {
      localFingerprint: local,
      peerFingerprint: peer,
    });
  });

  hub.on('removed', (sessionId) => {
    useSessionStore.getState().removeChat(sessionId);
    maybeLockVault();
  });
}

function maybeLockVault(): void {
  if (Object.keys(useSessionStore.getState().chats).length > 0) return;
  if (getChatHub().size > 0) return;
  if (getChatHub().handle) return;
}

function scheduleResume(delayMs = 0): void {
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => {
    resumeTimer = null;
    void resumeSessions();
  }, delayMs);
}

async function resumeSessions(): Promise<void> {
  if (resumeInFlight) return resumeInFlight;
  if (!messageVault.isUnlocked) return;
  if (getChatHub().size === 0) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

  resumeInFlight = (async () => {
    try {
      await getChatHub().reconnectAll();
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
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) onResume();
  });
  window.addEventListener('online', onResume);
}

function ensureHub(): ChatHub {
  const hub = getChatHub();
  if (!wired) {
    wireHub(hub);
    wired = true;
  }
  bindLifecycle();
  return hub;
}

export function useChatSession() {
  const store = useSessionStore();
  const chats = listChats(store.chats);
  const activeChat = store.activeSessionId ? (store.chats[store.activeSessionId] ?? null) : null;
  const [claimedHandle, setClaimedHandle] = useState<string | null>(null);

  useEffect(() => {
    bindLifecycle();
    const hub = ensureHub();
    setClaimedHandle(hub.handle);
    const meta = messageVault.getMeta();
    if (meta) {
      store.setVaultMeta(meta);
      store.setVaultReady(messageVault.isUnlocked);
    }
    const onStatus = (handle: string | null) => setClaimedHandle(handle);
    hub.on('handleStatus', onStatus);
    return () => hub.off('handleStatus', onStatus);
  }, []);

  async function setupVault(pin: string): Promise<void> {
    await unlockOrSetupVault(pin);
  }

  async function unlockOrSetupVault(pin: string): Promise<void> {
    if (messageVault.hasVault) {
      const ok = await messageVault.unlock(pin);
      if (!ok) {
        throw new Error('Incorrect PIN');
      }
    } else {
      await messageVault.setup(pin);
    }
    store.setVaultMeta(messageVault.getMeta());
    store.setVaultReady(true);
  }

  async function changeVaultPin(nextPin: string): Promise<void> {
    if (!messageVault.isUnlocked) {
      throw new Error('Unlock your current PIN first');
    }
    const meta = await messageVault.rewrap(nextPin);
    store.setVaultMeta(meta);
    store.setVaultReady(true);
  }

  async function createSession(): Promise<string> {
    if (!messageVault.isUnlocked) {
      throw new Error('Set your reveal PIN before creating a session');
    }
    const hub = ensureHub();
    const sessionId = await hub.createSession();
    store.upsertChat(sessionId, {
      isHost: true,
      shareUrl: getShareUrl(sessionId),
      status: hub.get(sessionId)?.status ?? 'awaiting_partner',
      expiresAt: hub.get(sessionId)?.expiresAt ?? null,
    });
    store.setActiveSessionId(sessionId);
    return sessionId;
  }

  async function joinSession(sessionId: string): Promise<void> {
    if (!messageVault.isUnlocked) {
      throw new Error('Set your reveal PIN before joining a session');
    }
    const hub = ensureHub();
    const record = store.chats[sessionId];
    if (hub.has(sessionId)) {
      await hub.reconnect(sessionId);
    } else if (record?.isHost) {
      await hub.createSession(sessionId);
    } else {
      await hub.joinSession(sessionId);
    }
    store.upsertChat(sessionId, {
      shareUrl: getShareUrl(sessionId),
      status: hub.get(sessionId)?.status ?? 'connecting',
      expiresAt: hub.get(sessionId)?.expiresAt ?? null,
    });
    store.setActiveSessionId(sessionId);
  }

  async function sendMessage(sessionId: string, text: string): Promise<void> {
    const hub = ensureHub();
    const client: IRelayClient | undefined = hub.getClient(sessionId);
    if (client && !client.connected) {
      await hub.reconnect(sessionId);
    }
    await hub.sendMessage(sessionId, text);
  }

  async function leaveSession(sessionId: string): Promise<void> {
    await ensureHub().leaveSession(sessionId);
  }

  async function expireSession(sessionId: string): Promise<void> {
    await ensureHub().leaveSession(sessionId);
  }

  async function claimHandle(handle: string): Promise<string> {
    if (!messageVault.isUnlocked) {
      throw new Error('Set your reveal PIN before going available');
    }
    const claimed = await ensureHub().claimHandle(handle);
    savePreferredHandle(claimed);
    return claimed;
  }

  async function unclaimHandle(): Promise<void> {
    await ensureHub().unclaimHandle();
    maybeLockVault();
  }

  async function ringHandle(handle: string): Promise<string> {
    if (!messageVault.isUnlocked) {
      throw new Error('Set your reveal PIN before reaching this person');
    }
    const hub = ensureHub();
    const sessionId = await hub.ringHandle(handle);
    store.upsertChat(sessionId, {
      isHost: true,
      shareUrl: getShareUrl(sessionId),
      status: hub.get(sessionId)?.status ?? 'awaiting_partner',
      expiresAt: hub.get(sessionId)?.expiresAt ?? null,
    });
    store.setActiveSessionId(sessionId);
    return sessionId;
  }

  function openSession(sessionId: string): void {
    store.setActiveSessionId(sessionId);
  }

  return {
    chats,
    activeChat,
    activeSessionId: store.activeSessionId,
    vaultReady: store.vaultReady,
    vaultMeta: store.vaultMeta,
    setupVault,
    unlockOrSetupVault,
    changeVaultPin,
    createSession,
    joinSession,
    sendMessage,
    leaveSession,
    expireSession,
    openSession,
    claimHandle,
    unclaimHandle,
    ringHandle,
    claimedHandle,
  };
}
