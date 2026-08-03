import type { ConnectionStatus } from '@goprivate/sdk';
import { create } from 'zustand';
import type { VaultMeta } from '@/services/vault';

/** Message as stored in app state — ciphertext only, never plaintext. */
export interface StoredMessage {
  id: string;
  encryptedText: string;
  timestamp: number;
  fromPeer: boolean;
}

interface SessionState {
  status: ConnectionStatus;
  sessionId: string | null;
  shareUrl: string | null;
  messages: StoredMessage[];
  error: string | null;
  partnerPresent: boolean;
  expiresAt: number | null;
  /** Public vault metadata (salt + wrapped key). Not enough to read messages alone. */
  vaultMeta: VaultMeta | null;
  /** True once local vault is set up / unlocked for this session. */
  vaultReady: boolean;

  setStatus: (status: ConnectionStatus) => void;
  setSessionId: (sessionId: string | null) => void;
  setShareUrl: (url: string | null) => void;
  addMessage: (message: StoredMessage) => void;
  setError: (error: string | null) => void;
  setPartnerPresent: (present: boolean) => void;
  setExpiresAt: (expiresAt: number | null) => void;
  setVaultMeta: (meta: VaultMeta | null) => void;
  setVaultReady: (ready: boolean) => void;
  reset: () => void;
  clearVault: () => void;
}

const initial = {
  status: 'disconnected' as ConnectionStatus,
  sessionId: null,
  shareUrl: null,
  messages: [] as StoredMessage[],
  error: null,
  partnerPresent: false,
  expiresAt: null as number | null,
  vaultMeta: null as VaultMeta | null,
  vaultReady: false,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initial,
  setStatus: (status) => set({ status }),
  setSessionId: (sessionId) => set({ sessionId }),
  setShareUrl: (shareUrl) => set({ shareUrl }),
  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    }),
  setError: (error) => set({ error }),
  setPartnerPresent: (partnerPresent) => set({ partnerPresent }),
  setExpiresAt: (expiresAt) => set({ expiresAt }),
  setVaultMeta: (vaultMeta) => set({ vaultMeta }),
  setVaultReady: (vaultReady) => set({ vaultReady }),
  reset: () =>
    set((state) => ({
      ...initial,
      vaultMeta: state.vaultMeta,
      vaultReady: state.vaultReady,
    })),
  clearVault: () => set({ vaultMeta: null, vaultReady: false }),
}));
