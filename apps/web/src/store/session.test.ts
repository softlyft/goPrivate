import { beforeEach, describe, expect, it } from 'vitest';
import { listChats, useSessionStore } from './session.js';

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({
      chats: {},
      activeSessionId: null,
      vaultMeta: null,
      vaultReady: false,
    });
  });

  it('keeps messages isolated per conversation and dedupes', () => {
    const store = useSessionStore.getState();
    store.upsertChat('aaa', { status: 'ready' });
    store.upsertChat('bbb', { status: 'awaiting_partner' });
    store.addMessage('aaa', { id: '1', encryptedText: 'c1', timestamp: 1, fromPeer: false });
    store.addMessage('aaa', { id: '1', encryptedText: 'c1', timestamp: 1, fromPeer: false });
    store.addMessage('bbb', { id: '2', encryptedText: 'c2', timestamp: 2, fromPeer: true });

    const next = useSessionStore.getState();
    expect(next.chats.aaa?.messages).toHaveLength(1);
    expect(next.chats.bbb?.messages).toHaveLength(1);
    expect(listChats(next.chats)).toHaveLength(2);
  });

  it('increments unread only for background chats', () => {
    const store = useSessionStore.getState();
    store.upsertChat('aaa');
    store.upsertChat('bbb');
    store.setActiveSessionId('aaa');
    store.addMessage('aaa', { id: '1', encryptedText: 'a', timestamp: 1, fromPeer: true });
    store.addMessage('bbb', { id: '2', encryptedText: 'b', timestamp: 2, fromPeer: true });

    expect(useSessionStore.getState().chats.aaa?.unreadCount).toBe(0);
    expect(useSessionStore.getState().chats.bbb?.unreadCount).toBe(1);

    store.setActiveSessionId('bbb');
    expect(useSessionStore.getState().chats.bbb?.unreadCount).toBe(0);
  });

  it('removeChat leaves other conversations and vault intact', () => {
    useSessionStore.getState().setVaultMeta({ salt: 's', wrappedKey: 'w' });
    useSessionStore.getState().setVaultReady(true);
    useSessionStore.getState().upsertChat('aaa');
    useSessionStore.getState().upsertChat('bbb');
    useSessionStore.getState().removeChat('aaa');

    expect(useSessionStore.getState().chats.aaa).toBeUndefined();
    expect(useSessionStore.getState().chats.bbb).toBeDefined();
    expect(useSessionStore.getState().vaultReady).toBe(true);
  });
});
