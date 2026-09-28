'use client';

import { isHandleSlug, sessionTtlLabel } from '@goprivate/config';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import { PinPad, PinPadViewport } from '@/components/PinPad';
import { Button } from '@/components/ui/button';
import { Glass } from '@/components/ui/glass';
import { useChatSession } from '@/hooks/use-chat-session';
import { messageVault } from '@/services/vault';

function handleErrorCopy(error: string): string {
  if (error.includes('HANDLE_UNAVAILABLE')) {
    return 'This person is not online. Lasting links only work while their app or tab is connected — there is no voicemail.';
  }
  if (error.includes('HANDLE_BUSY')) {
    return 'This person already has too many conversations open. Try again later.';
  }
  if (error.includes('HANDLE_TAKEN') || error.includes('HANDLE_FORBIDDEN')) {
    return 'This name is not available right now.';
  }
  return error;
}

export function HandlePage() {
  const params = useParams<{ handle: string }>();
  const handle = (params.handle ?? '').toLowerCase();
  const router = useRouter();
  const { unlockOrSetupVault, ringHandle } = useChatSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(!messageVault.isUnlocked);

  async function reach(nextHandle: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const sessionId = await ringHandle(nextHandle);
      router.replace(`/chat/${sessionId}`);
    } catch (err) {
      setError(handleErrorCopy(err instanceof Error ? err.message : 'Could not reach this person'));
      setBusy(false);
    }
  }

  async function handlePin(pin: string): Promise<void> {
    try {
      await unlockOrSetupVault(pin);
      setShowPin(false);
      await reach(handle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set PIN');
    }
  }

  if (!isHandleSlug(handle)) {
    return (
      <AppShell>
        <Header />
        <main className="flex flex-1 items-center justify-center px-5">
          <Glass contentClassName="px-8 py-8 text-center">
            <p className="text-sm text-muted">That link is not a valid name.</p>
            <Button className="mt-4" variant="secondary" onClick={() => router.push('/')}>
              Home
            </Button>
          </Glass>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header />
      <main className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-5 py-6">
        <Glass
          className="my-auto w-full max-w-sm shrink-0"
          contentClassName="flex flex-col items-center gap-5 px-6 py-8 text-center"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            Lasting link
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">/{handle}</h1>
          <p className="text-sm leading-relaxed text-muted">
            If they are online, this starts a private {sessionTtlLabel()} chat. If they are not,
            nothing is stored — there is no inbox.
          </p>
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <Button
            disabled={busy}
            onClick={() => {
              if (!messageVault.isUnlocked) {
                setShowPin(true);
                return;
              }
              void reach(handle);
            }}
          >
            {busy ? 'Reaching…' : `Reach ${handle}`}
          </Button>
          <button
            type="button"
            className="text-xs text-muted underline-offset-4 hover:underline"
            onClick={() => router.push('/')}
          >
            Back home
          </button>
        </Glass>

        {showPin ? (
          <div className="absolute inset-0 z-20 flex min-h-0 flex-col bg-background/55 backdrop-blur-xl animate-fade-in">
            <PinPadViewport>
              <PinPad
                title={messageVault.hasVault ? 'Enter your PIN' : 'Set reveal PIN'}
                subtitle="This PIN encrypts messages on your device."
                confirmLabel="Continue"
                onComplete={(pin) => void handlePin(pin)}
                onCancel={() => setShowPin(false)}
                mode={messageVault.hasVault ? 'verify' : 'setup'}
              />
            </PinPadViewport>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
