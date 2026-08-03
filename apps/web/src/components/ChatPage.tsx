'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { Header } from '@/components/Header';
import { MessageComposer } from '@/components/MessageComposer';
import { MessageList } from '@/components/MessageList';
import { PinPad } from '@/components/PinPad';
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
    status,
    messages,
    error,
    shareUrl,
    partnerPresent,
    expiresAt,
    vaultReady,
    setupVault,
    joinSession,
    sendMessage,
    leaveSession,
    sessionId: storeSessionId,
  } = useChatSession();
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(true);
  const [pinReady, setPinReady] = useState(vaultReady && messageVault.isUnlocked);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!pinReady) return;
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    let cancelled = false;

    async function bootstrap() {
      try {
        if (storeSessionId === sessionId && status !== 'disconnected' && status !== 'error') {
          return;
        }
        await joinSession(sessionId);
      } catch {
        // error surfaced via store
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
    await leaveSession();
    router.push('/');
  }

  async function handleHome() {
    await leaveSession();
    router.push('/');
  }

  async function handleCopy() {
    const url = shareUrl ?? `${window.location.origin}/chat/${sessionId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleExpire() {
    messageVault.lock();
    const store = useSessionStore.getState();
    if (store.status !== 'expired') {
      store.setStatus('expired');
      store.setError('This session has expired (15 minute limit).');
    }
    store.clearVault();
  }

  async function handlePinSetup(pin: string) {
    await setupVault(pin);
    setPinReady(true);
  }

  function handleCancelPinSetup() {
    messageVault.lock();
    useSessionStore.getState().clearVault();
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
        <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain px-6" data-scroll>
          <PinPad
            title="Set reveal PIN"
            subtitle="This PIN encrypts messages on your device and unlocks older ones."
            confirmLabel="Join Session"
            mode="setup"
            onComplete={(pin) => void handlePinSetup(pin)}
            onCancel={handleCancelPinSetup}
          />
        </main>
      </AppShell>
    );
  }

  const ready = status === 'ready';
  const expired = status === 'expired';
  const showShare =
    !joining &&
    !expired &&
    (status === 'awaiting_partner' || status === 'handshaking' || (!partnerPresent && !ready));

  return (
    <AppShell className="animate-fade-in">
      <Header
        title="goPrivate"
        onHomeClick={handleHome}
        center={<SessionTimer expiresAt={expiresAt} onExpire={handleExpire} />}
        right={
          <div className="flex items-center gap-3">
            <ConnectionStatus status={status} />
            <Button variant="danger" onClick={handleLeave}>
              Leave
            </Button>
          </div>
        }
      />

      {showShare && (
        <div className="border-b border-border bg-surface px-4 py-3">
          <p className="text-sm text-muted">
            Share this link with one person. Sessions end after 15 minutes or when everyone leaves.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-bubble-peer px-3 py-1.5 font-mono text-xs">
              {shareUrl ??
                `${typeof window !== 'undefined' ? window.location.origin : ''}/chat/${sessionId}`}
            </code>
            <Button variant="secondary" onClick={handleCopy} className="shrink-0">
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="border-b border-border bg-red-50 px-4 py-2 text-sm text-danger">{error}</div>
      )}

      <MessageList messages={messages} vaultReady={vaultReady || pinReady} />
      <MessageComposer disabled={!ready || expired} onSend={sendMessage} />
    </AppShell>
  );
}
