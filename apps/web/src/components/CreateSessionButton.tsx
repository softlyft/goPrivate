'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PinPad } from '@/components/PinPad';
import { Button } from '@/components/ui/button';
import { useChatSession } from '@/hooks/use-chat-session';

export function CreateSessionButton() {
  const router = useRouter();
  const { setupVault, createSession } = useChatSession();
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePinSet(pin: string) {
    setLoading(true);
    setError(null);
    try {
      await setupVault(pin);
      const sessionId = await createSession();
      router.push(`/chat/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setLoading(false);
      setShowPin(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <Button onClick={() => setShowPin(true)} disabled={loading} className="min-w-48">
          Create Session
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      {showPin && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background px-6 animate-fade-in">
          {loading ? (
            <p className="text-sm text-muted">Creating session…</p>
          ) : (
            <PinPad
              title="Set reveal PIN"
              subtitle="This PIN encrypts messages on your device and is required to unmask older ones."
              confirmLabel="Create Session"
              onComplete={(pin) => void handlePinSet(pin)}
              onCancel={() => setShowPin(false)}
              mode="setup"
            />
          )}
        </div>
      )}
    </>
  );
}
