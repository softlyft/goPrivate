import type { ConnectionStatus } from '@goprivate/sdk';
import { create } from 'zustand';
import type { VaultMeta } from '../services/vault';

/** Message as stored in app state — ciphertext only, never plaintext. */
export interface StoredMessage {
  id: string;
  encryptedText: string;
  timestamp: number;
  fromPeer: boolean;
}

export interface ChatRecord {
  sessionId: string;
  isHost: boolean;
  status: ConnectionStatus;
  shareUrl: string | null;
  messages: StoredMessage[];
  error: string | null;
  partnerPresent: boolean;
  expiresAt: number | null;
  unreadCount: number;
  localFingerprint: string | null;
  peerFingerprint: string | null;
  createdAt: number;
}

interface SessionState {
  chats: Record<string, ChatRecord>;
  activeSessionId: string | null;
  vaultMeta: VaultMeta | null;
  vaultReady: boolean;

  upsertChat: (sessionId: string, patch?: Partial<ChatRecord>) => void;
  addMessage: (sessionId: string, message: StoredMessage) => void;
  removeChat: (sessionId: string) => void;
  setActiveSessionId: (sessionId: string | null) => void;
  setVaultMeta: (meta: VaultMeta | null) => void;
  setVaultReady: (ready: boolean) => void;
  clearVault: () => void;
}

function emptyChat(sessionId: string): ChatRecord {
  return {
    sessionId,
    isHost: false,
    status: 'connecting',
    shareUrl: null,
    messages: [],
    error: null,
    partnerPresent: false,
    expiresAt: null,
    unreadCount: 0,
    localFingerprint: null,
    peerFingerprint: null,
    createdAt: Date.now(),
  };
}

export function listChats(chats: Record<string, ChatRecord>): ChatRecord[] {
  return Object.values(chats).sort((a, b) => b.createdAt - a.createdAt);
}

export const useSessionStore = create<SessionState>((set) => ({
  chats: {},
  activeSessionId: null,
  vaultMeta: null,
  vaultReady: false,

  upsertChat: (sessionId, patch) =>
    set((state) => {
      const prev = state.chats[sessionId] ?? emptyChat(sessionId);
      return {
        chats: {
          ...state.chats,
          [sessionId]: { ...prev, ...patch, sessionId },
        },
      };
    }),

  addMessage: (sessionId, message) =>
    set((state) => {
      const prev = state.chats[sessionId] ?? emptyChat(sessionId);
      if (prev.messages.some((m) => m.id === message.id)) return state;
      const unreadCount =
        state.activeSessionId === sessionId ? prev.unreadCount : prev.unreadCount + 1;
      return {
        chats: {
          ...state.chats,
          [sessionId]: {
            ...prev,
            messages: [...prev.messages, message],
            unreadCount,
          },
        },
      };
    }),

  removeChat: (sessionId) =>
    set((state) => {
      const chats = { ...state.chats };
      delete chats[sessionId];
      return {
        chats,
        activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
      };
    }),

  setActiveSessionId: (sessionId) =>
    set((state) => {
      if (!sessionId) return { activeSessionId: null };
      const chat = state.chats[sessionId];
      if (!chat) return { activeSessionId: sessionId };
      return {
        activeSessionId: sessionId,
        chats: {
          ...state.chats,
          [sessionId]: { ...chat, unreadCount: 0 },
        },
      };
    }),

  setVaultMeta: (vaultMeta) => set({ vaultMeta }),
  setVaultReady: (vaultReady) => set({ vaultReady }),
  clearVault: () => set({ vaultMeta: null, vaultReady: false }),
}));
