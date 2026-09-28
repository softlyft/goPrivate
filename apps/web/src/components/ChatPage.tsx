'use client';

import { sessionTtlLabel } from '@goprivate/config';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { ConversationEnded } from '@/components/ConversationEnded';
import { Header } from '@/components/Header';
import { MessageComposer } from '@/components/MessageComposer';
import { MessageList } from '@/components/MessageList';
import { PinPad, PinPadViewport } from '@/components/PinPad';
import { SessionTimer } from '@/components/SessionTimer';
import { Button } from '@/components/ui/button';
import { useChatSession } from '@/hooks/use-chat-session';
import { messageVault } from '@/services/vault';
import { useSessionStore } from '@/store/session';

export function ChatPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();
  const {
    vaultReady,
    setupVault,
    joinSession,
    sendMessage,
    leaveSession,
    expireSession,
    openSession,
  } = useChatSession();
  const chat = useSessionStore((s) => (sessionId ? s.chats[sessionId] : undefined));
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(!chat);
  const [pinReady, setPinReady] = useState(vaultReady && messageVault.isUnlocked);
  const [endedByLeave, setEndedByLeave] = useState(false);

  useEffect(() => {
    setEndedByLeave(false);
    if (sessionId) openSession(sessionId);
    return () => {
      const store = useSessionStore.getState();
      if (store.activeSessionId === sessionId) {
        store.setActiveSessionId(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!pinReady || !sessionId) return;

    let cancelled = false;

    async function bootstrap() {
      try {
        await joinSession(sessionId);
      } catch (err) {
        useSessionStore.getState().upsertChat(sessionId, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to join',
        });
      } finally {
        if (!cancelled) setJoining(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, pinReady]);

  async function handleLeave() {
    await leaveSession(sessionId);
    setEndedByLeave(true);
    const remaining = useSessionStore.getState().chats;
    if (Object.keys(remaining).length > 0) {
      router.push('/chats');
    }
  }

  function handleInbox() {
    router.push('/chats');
  }

  async function handleDismissEnded() {
    if (sessionId) {
      await leaveSession(sessionId);
    }
    router.push('/chats');
  }

  async function handleCopy() {
    const url = chat?.shareUrl ?? `${window.location.origin}/chat/${sessionId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleExpire() {
    setEndedByLeave(true);
    await expireSession(sessionId);
  }

  async function handlePinSetup(pin: string) {
    await setupVault(pin);
    setPinReady(true);
  }

  function handleCancelPinSetup() {
    router.push('/');
  }

  if (!pinReady) {
    return (
      <AppShell className="animate-fade-in">
        <Header
          title="goPrivate"
          onHomeClick={handleCancelPinSetup}
          right={
            <Button variant="ghost" onClick={handleCancelPinSetup}>
              Cancel
            </Button>
          }
        />
        <PinPadViewport>
          <PinPad
            title="Set reveal PIN"
            subtitle="This PIN encrypts messages on your device and unlocks older ones."
            confirmLabel="Join Session"
            mode="setup"
            onComplete={(pin) => void handlePinSetup(pin)}
            onCancel={handleCancelPinSetup}
          />
        </PinPadViewport>
      </AppShell>
    );
  }

  const status = chat?.status ?? 'connecting';
  const messages = chat?.messages ?? [];
  const error = chat?.error ?? null;
  const shareUrl = chat?.shareUrl ?? null;
  const partnerPresent = chat?.partnerPresent ?? false;
  const expiresAt = chat?.expiresAt ?? null;
  const ready = status === 'ready';
  const expired = status === 'expired';
  const conversationEnded = expired || endedByLeave;
  const showShare =
    !joining &&
    !conversationEnded &&
    (status === 'awaiting_partner' || status === 'handshaking' || (!partnerPresent && !ready));

  if (conversationEnded) {
    return (
      <AppShell className="animate-fade-in">
        <Header title="goPrivate" onHomeClick={() => void handleDismissEnded()} />
        <ConversationEnded onHome={() => void handleDismissEnded()} />
      </AppShell>
    );
  }

  return (
    <AppShell className="animate-fade-in">
      <Header
        leading={
          <button
            type="button"
            onClick={handleInbox}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-black/[0.04]"
          >
            ← Back
          </button>
        }
        center={<SessionTimer expiresAt={expiresAt} onExpire={handleExpire} />}
        right={
          <div className="flex items-center gap-3 sm:gap-4">
            <ConnectionStatus status={status} />
            <Button variant="danger" onClick={() => void handleLeave()}>
              Leave
            </Button>
          </div>
        }
      />

      {showShare && (
        <div className="border-b border-black/[0.06] bg-white/35 px-4 py-3 backdrop-blur-xl">
          <p className="text-sm text-muted">
            Share this link with one person. You can start more 1:1 chats from Open conversations.
            Sessions end after {sessionTtlLabel()} or when everyone leaves.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-full border border-black/8 bg-white/60 px-3 py-1.5 font-mono text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              {shareUrl ??
                `${typeof window !== 'undefined' ? window.location.origin : ''}/chat/${sessionId}`}
            </code>
            <Button variant="secondary" onClick={() => void handleCopy()} className="shrink-0">
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="border-b border-black/[0.06] bg-red-50/80 px-4 py-2 text-sm text-danger backdrop-blur-md">
          {error}
        </div>
      )}

      <MessageList messages={messages} vaultReady={vaultReady || pinReady} />
      <MessageComposer
        disabled={!ready || expired}
        onSend={(text) => sendMessage(sessionId, text)}
      />
    </AppShell>
  );
}
