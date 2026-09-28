'use client';

import { pinLengthLabel } from '@goprivate/config';
import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PinPad, PinPadViewport } from '@/components/PinPad';
import { Button } from '@/components/ui/button';
import { Glass } from '@/components/ui/glass';
import { useChatSession } from '@/hooks/use-chat-session';
import { useDeviceSettings } from '@/hooks/use-device-settings';
import { saveDeviceSettings } from '@/services/device-settings';
import { messageVault } from '@/services/vault';
import { cn } from '@/utils/cn';

type PinStep = 'closed' | 'set' | 'verify-current' | 'set-new';

export function SettingsControl() {
  const { unlockOrSetupVault, changeVaultPin } = useChatSession();
  const settings = useDeviceSettings();
  const [open, setOpen] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [pinStep, setPinStep] = useState<PinStep>('closed');
  const [pinError, setPinError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setHasPin(messageVault.hasVault);
  }, [open]);

  function closePin(): void {
    setPinStep('closed');
    setPinError(null);
  }

  async function handleSetPin(pin: string): Promise<void> {
    try {
      await unlockOrSetupVault(pin);
      setHasPin(true);
      closePin();
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Could not save PIN');
    }
  }

  async function handleVerifyCurrent(pin: string): Promise<void> {
    try {
      await unlockOrSetupVault(pin);
      setPinError(null);
      setPinStep('set-new');
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Incorrect PIN');
    }
  }

  async function handleSetNew(pin: string): Promise<void> {
    try {
      await changeVaultPin(pin);
      setHasPin(true);
      closePin();
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Could not update PIN');
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Settings"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/[0.04] hover:text-foreground"
      >
        <Settings className="h-4 w-4" strokeWidth={2} />
      </button>

      {open && mounted
        ? createPortal(
            <div className="pointer-events-auto absolute inset-0 z-50 flex min-h-0 flex-col bg-background animate-fade-in">
              {pinStep !== 'closed' ? (
                <PinPadViewport>
                  <PinPad
                    title={
                      pinStep === 'verify-current'
                        ? 'Current PIN'
                        : pinStep === 'set-new'
                          ? 'New PIN'
                          : `Set ${pinLengthLabel()} PIN`
                    }
                    subtitle={
                      pinStep === 'verify-current'
                        ? 'Enter your current PIN to change it.'
                        : 'This PIN stays on this device. You will not be asked to set it again to start a chat.'
                    }
                    confirmLabel={pinStep === 'verify-current' ? 'Continue' : 'Save PIN'}
                    mode={pinStep === 'verify-current' ? 'verify' : 'setup'}
                    externalError={pinError}
                    onComplete={(pin) => {
                      if (pinStep === 'verify-current') void handleVerifyCurrent(pin);
                      else if (pinStep === 'set-new') void handleSetNew(pin);
                      else void handleSetPin(pin);
                    }}
                    onCancel={closePin}
                  />
                </PinPadViewport>
              ) : (
                <div
                  data-scroll
                  className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 py-6"
                >
                  <Glass
                    className="mx-auto w-full max-w-sm"
                    contentClassName="flex flex-col gap-5 px-5 py-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                          Settings
                        </p>
                        <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                          This device
                        </h2>
                      </div>
                      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                        Done
                      </Button>
                    </div>

                    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-black/8 bg-white/45 px-4 py-3">
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-medium text-foreground">
                          {pinLengthLabel()} PIN
                        </p>
                        <p className="text-[11px] leading-relaxed text-muted">
                          {hasPin
                            ? 'Saved on this device. Used to encrypt local messages.'
                            : 'Set once. Required before you start or join a chat.'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0"
                        onClick={() => {
                          setPinError(null);
                          setPinStep(hasPin ? 'verify-current' : 'set');
                        }}
                      >
                        {hasPin ? 'Change' : 'Set'}
                      </Button>
                    </div>

                    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-black/8 bg-white/45 px-4 py-3">
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-medium text-foreground">Scramble messages</p>
                        <p className="text-[11px] leading-relaxed text-muted">
                          Hide older chat text on screen. Turn off to keep messages readable.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.scrambleMessages}
                        onClick={() =>
                          saveDeviceSettings({ scrambleMessages: !settings.scrambleMessages })
                        }
                        className={cn(
                          'flex h-7 w-11 shrink-0 items-center overflow-hidden rounded-full p-0.5 transition-colors',
                          settings.scrambleMessages ? 'bg-accent' : 'bg-black/15',
                        )}
                      >
                        <span
                          className={cn(
                            'h-6 w-6 rounded-full bg-white shadow-sm transition-transform',
                            settings.scrambleMessages ? 'translate-x-4' : 'translate-x-0',
                          )}
                        />
                      </button>
                    </div>
                  </Glass>
                </div>
              )}
            </div>,
            document.getElementById('goprivate-overlay-root') ?? document.body,
          )
        : null}
    </>
  );
}
