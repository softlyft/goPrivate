import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from './session.js';

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
    useSessionStore.getState().clearVault();
  });

  it('tracks session fields and dedupes messages', () => {
    const store = useSessionStore.getState();
    store.setSessionId('abc');
    store.setShareUrl('https://example/chat/abc');
    store.setStatus('ready');
    store.setPartnerPresent(true);
    store.setExpiresAt(123);
    store.setError(null);
    store.addMessage({
      id: '1',
      encryptedText: 'c1',
      timestamp: 1,
      fromPeer: false,
    });
    store.addMessage({
      id: '1',
      encryptedText: 'c1',
      timestamp: 1,
      fromPeer: false,
    });

    const next = useSessionStore.getState();
    expect(next.sessionId).toBe('abc');
    expect(next.messages).toHaveLength(1);
    expect(next.status).toBe('ready');
  });

  it('reset preserves vault meta until clearVault', () => {
    useSessionStore.getState().setVaultMeta({ salt: 's', wrappedKey: 'w' });
    useSessionStore.getState().setVaultReady(true);
    useSessionStore.getState().setSessionId('x');
    useSessionStore.getState().reset();
    expect(useSessionStore.getState().sessionId).toBeNull();
    expect(useSessionStore.getState().vaultMeta).toEqual({ salt: 's', wrappedKey: 'w' });
    useSessionStore.getState().clearVault();
    expect(useSessionStore.getState().vaultMeta).toBeNull();
    expect(useSessionStore.getState().vaultReady).toBe(false);
  });
});
