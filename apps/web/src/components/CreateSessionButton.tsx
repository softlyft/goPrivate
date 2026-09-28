'use client';

import { concurrentChatLimitHint, maxConcurrentChats } from '@goprivate/config';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PinPad, PinPadViewport } from '@/components/PinPad';
import { Button } from '@/components/ui/button';
import { Glass } from '@/components/ui/glass';
import { useChatSession } from '@/hooks/use-chat-session';
import { messageVault } from '@/services/vault';

export function CreateSessionButton() {
  const router = useRouter();
  const { chats, claimedHandle, unlockOrSetupVault, createSession } = useChatSession();
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const premium = Boolean(claimedHandle);
  const atCap = chats.length >= maxConcurrentChats(premium);

  async function startConversation(): Promise<void> {
    setLoading(true);
    setError(null);
    setStatusText('Waking relay / connecting…');
    try {
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

  async function handlePinSet(pin: string) {
    try {
      await unlockOrSetupVault(pin);
      await startConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setLoading(false);
      setStatusText(null);
      setShowPin(false);
    }
  }

  function handleClick() {
    setError(null);
    if (atCap) {
      setError(concurrentChatLimitHint(premium));
      return;
    }
    if (messageVault.isUnlocked) {
      void startConversation();
      return;
    }
    setShowPin(true);
  }

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <Button onClick={handleClick} disabled={loading || atCap} className="min-w-52">
          Start Private Conversation
        </Button>
        <p className="max-w-[18rem] text-center text-[11px] leading-relaxed text-muted">
          {concurrentChatLimitHint(premium)}
        </p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      {(showPin || loading) && (
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
                title={messageVault.hasVault ? 'Enter your PIN' : 'Set reveal PIN'}
                subtitle={
                  messageVault.hasVault
                    ? 'Unlock the PIN saved on this device to start a chat.'
                    : 'This PIN encrypts messages on your device. You can also set it in Settings.'
                }
                confirmLabel="Continue"
                onComplete={(pin) => void handlePinSet(pin)}
                onCancel={() => setShowPin(false)}
                mode={messageVault.hasVault ? 'verify' : 'setup'}
              />
            </PinPadViewport>
          )}
        </div>
      )}
    </>
  );
}
