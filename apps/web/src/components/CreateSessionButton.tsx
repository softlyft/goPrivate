'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PinPad, PinPadViewport } from '@/components/PinPad';
import { Button } from '@/components/ui/button';
import { Glass } from '@/components/ui/glass';
import { useChatSession } from '@/hooks/use-chat-session';

export function CreateSessionButton() {
  const router = useRouter();
  const { setupVault, createSession } = useChatSession();
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePinSet(pin: string) {
    setLoading(true);
    setError(null);
    setStatusText('Waking relay / connecting…');
    try {
      await setupVault(pin);
      setStatusText('Creating session…');
      const sessionId = await createSession();
      router.push(`/chat/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setLoading(false);
      setStatusText(null);
      setShowPin(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <Button onClick={() => setShowPin(true)} disabled={loading} className="min-w-52">
          Create Session
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      {showPin && (
        <div className="absolute inset-0 z-20 flex min-h-0 flex-col bg-background/55 backdrop-blur-xl animate-fade-in">
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6">
              <Glass contentClassName="px-8 py-6 text-center">
                <p className="text-sm text-muted">{statusText ?? 'Working…'}</p>
                <p className="mt-2 text-[11px] text-muted">
                  Free-tier relays can take up to a minute to wake.
                </p>
              </Glass>
            </div>
          ) : (
            <PinPadViewport>
              <PinPad
                title="Set reveal PIN"
                subtitle="This PIN encrypts messages on your device and is required to unmask older ones."
                confirmLabel="Create Session"
                onComplete={(pin) => void handlePinSet(pin)}
                onCancel={() => setShowPin(false)}
                mode="setup"
              />
            </PinPadViewport>
          )}
        </div>
      )}
    </>
  );
}
