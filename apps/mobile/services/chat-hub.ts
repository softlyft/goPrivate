import { AppState } from 'react-native';
import { ChatHub, type ChatSnapshot } from '@goprivate/sdk';
import { messageVault } from './vault';
import { useSessionStore } from '../store/session';
import { createMobileRelayClient } from '../utils/relay';
import { getHandleClaimSecret, getRelayUrl } from '../utils/env';
import { createHandleProof, savePreferredHandle } from './handle-lease';
import { createDeepLink } from '../utils/deeplink';

let hubSingleton: ChatHub | null = null;
let wired = false;
let appStateBound = false;

export function getChatHub(): ChatHub {
  if (!hubSingleton) {
    hubSingleton = new ChatHub({
      getRelayUrl,
      getClaimSecret: getHandleClaimSecret,
      getHandleProof: (handle) => createHandleProof(handle),
      createClient: () => createMobileRelayClient(),
    });
  }
  if (!wired) {
    wireHub(hubSingleton);
    wired = true;
  }
  bindAppState();
  return hubSingleton;
}

function shareUrlFor(sessionId: string): string {
  return createDeepLink(sessionId).https;
}

function applySnapshot(sessionId: string, snapshot: ChatSnapshot): void {
  useSessionStore.getState().upsertChat(sessionId, {
    isHost: snapshot.isHost,
    status: snapshot.status,
    expiresAt: snapshot.expiresAt,
    partnerPresent: snapshot.partnerPresent,
    error: snapshot.error,
    shareUrl: shareUrlFor(sessionId),
  });
}

async function ingestPlaintextMessage(
  sessionId: string,
  message: { id: string; text: string; timestamp: number; fromPeer: boolean },
): Promise<void> {
  if (!messageVault.isUnlocked) {
    useSessionStore.getState().upsertChat(sessionId, {
      error: 'Vault is locked — cannot store message securely',
    });
    return;
  }
  if (!message.text) {
    useSessionStore.getState().upsertChat(sessionId, { error: 'Received empty message' });
    return;
  }
  try {
    const encryptedText = await messageVault.encrypt(message.text);
    useSessionStore.getState().addMessage(sessionId, {
      id: message.id,
      encryptedText,
      timestamp: message.timestamp,
      fromPeer: message.fromPeer,
    });
  } catch (err) {
    useSessionStore.getState().upsertChat(sessionId, {
      error: err instanceof Error ? err.message : 'Failed to store message',
    });
  }
}

function maybeLockVault(): void {
  if (Object.keys(useSessionStore.getState().chats).length > 0) return;
  if (getChatHub().size > 0) return;
  if (getChatHub().handle) return;
  void messageVault.lock();
  useSessionStore.getState().clearVault();
}

function wireHub(hub: ChatHub): void {
  hub.on('snapshot', applySnapshot);
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

function bindAppState(): void {
  if (appStateBound) return;
  appStateBound = true;
  let lastBackgroundAt = 0;
  AppState.addEventListener('change', (next) => {
    if (next === 'background') {
      lastBackgroundAt = Date.now();
      return;
    }
    if (
      next === 'active' &&
      messageVault.isUnlocked &&
      lastBackgroundAt > 0 &&
      Date.now() - lastBackgroundAt > 500
    ) {
      lastBackgroundAt = 0;
      void getChatHub().reconnectAll();
    }
  });
}

export async function startHostChat(sessionId?: string): Promise<string> {
  const hub = getChatHub();
  const id = await hub.createSession(sessionId);
  useSessionStore.getState().upsertChat(id, {
    isHost: true,
    shareUrl: shareUrlFor(id),
    status: hub.get(id)?.status ?? 'awaiting_partner',
    expiresAt: hub.get(id)?.expiresAt ?? null,
  });
  useSessionStore.getState().setActiveSessionId(id);
  return id;
}

export async function startGuestChat(sessionId: string): Promise<void> {
  const hub = getChatHub();
  if (!hub.has(sessionId)) {
    await hub.joinSession(sessionId);
  }
  useSessionStore.getState().upsertChat(sessionId, {
    shareUrl: shareUrlFor(sessionId),
    status: hub.get(sessionId)?.status ?? 'connecting',
    expiresAt: hub.get(sessionId)?.expiresAt ?? null,
  });
  useSessionStore.getState().setActiveSessionId(sessionId);
}

export async function ensureChat(sessionId: string, isHost: boolean): Promise<void> {
  const hub = getChatHub();
  const hosted = isHost || Boolean(useSessionStore.getState().chats[sessionId]?.isHost);
  if (hub.has(sessionId)) {
    useSessionStore.getState().setActiveSessionId(sessionId);
    await hub.reconnect(sessionId);
    return;
  }
  if (hosted) {
    await startHostChat(sessionId);
    return;
  }
  await startGuestChat(sessionId);
}

export async function claimHandle(handle: string): Promise<string> {
  if (!messageVault.isUnlocked) {
    throw new Error('Set your reveal PIN before going available');
  }
  const claimed = await getChatHub().claimHandle(handle);
  await savePreferredHandle(claimed);
  return claimed;
}

export async function unclaimHandle(): Promise<void> {
  await getChatHub().unclaimHandle();
  maybeLockVault();
}

export async function startHandleChat(handle: string): Promise<string> {
  const hub = getChatHub();
  const sessionId = await hub.ringHandle(handle);
  useSessionStore.getState().upsertChat(sessionId, {
    isHost: true,
    shareUrl: shareUrlFor(sessionId),
    status: hub.get(sessionId)?.status ?? 'awaiting_partner',
    expiresAt: hub.get(sessionId)?.expiresAt ?? null,
  });
  useSessionStore.getState().setActiveSessionId(sessionId);
  return sessionId;
}
