'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Glass } from '@/components/ui/glass';
import { cn } from '@/utils/cn';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const;

export function PinPad({
  title,
  subtitle,
  confirmLabel = 'Continue',
  onComplete,
  onCancel,
  mode = 'setup',
  externalError,
}: {
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  onComplete: (pin: string) => void;
  onCancel?: () => void;
  mode?: 'setup' | 'verify';
  externalError?: string | null;
}) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const activeValue = step === 'confirm' ? confirmPin : pin;
  const activeSetter = step === 'confirm' ? setConfirmPin : setPin;

  useEffect(() => {
    if (!externalError) return;
    const message = externalError.replace(/\s*\(\d+\)$/, '');
    fail(message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalError]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') {
        activeSetter((prev) => (prev.length < 4 ? prev + e.key : prev));
      } else if (e.key === 'Backspace') {
        activeSetter((prev) => prev.slice(0, -1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeSetter]);

  function pushDigit(digit: string) {
    setError(null);
    activeSetter((prev) => (prev.length < 4 ? prev + digit : prev));
  }

  function backspace() {
    setError(null);
    activeSetter((prev) => prev.slice(0, -1));
  }

  function fail(message: string) {
    setError(message);
    setShake(true);
    window.setTimeout(() => setShake(false), 400);
    if (mode === 'verify') {
      setPin('');
    } else if (step === 'confirm') {
      setConfirmPin('');
    }
  }

  function submit() {
    if (activeValue.length !== 4) return;

    if (mode === 'verify') {
      onComplete(activeValue);
      return;
    }

    if (step === 'enter') {
      setStep('confirm');
      return;
    }

    if (pin !== confirmPin) {
      fail('PINs do not match');
      setStep('enter');
      setPin('');
      setConfirmPin('');
      return;
    }

    onComplete(pin);
  }

  const stepLabel =
    mode === 'verify'
      ? 'Enter your reveal PIN'
      : step === 'enter'
        ? 'Choose a 4-digit PIN'
        : 'Confirm your PIN';

  return (
    <Glass
      className="w-full max-w-xs shrink-0 animate-fade-in"
      contentClassName="flex flex-col items-center gap-4 px-5 py-5 sm:gap-6 sm:py-7"
    >
      <div className="space-y-1.5 text-center sm:space-y-2">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
        {subtitle && <p className="text-xs leading-relaxed text-muted sm:text-sm">{subtitle}</p>}
        <p className="text-xs text-muted">{stepLabel}</p>
      </div>

      <div className={cn('flex gap-3', shake && 'animate-pin-shake')} aria-label="PIN digits">
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-3.5 w-3.5 rounded-full border transition-all duration-200',
              i < activeValue.length
                ? 'scale-110 border-foreground bg-foreground shadow-[0_0_0_3px_rgba(0,0,0,0.08)]'
                : 'border-black/15 bg-white/40',
            )}
          />
        ))}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="grid w-full grid-cols-3 gap-1.5 sm:gap-2">
        {KEYS.map((key, index) => {
          if (key === '') {
            return <div key={`empty-${index}`} />;
          }
          if (key === '⌫') {
            return (
              <button
                key={key}
                type="button"
                onClick={backspace}
                className="rounded-2xl py-3 text-sm text-muted transition-colors hover:bg-black/[0.05] sm:py-3.5"
                aria-label="Delete"
              >
                ⌫
              </button>
            );
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => pushDigit(key)}
              className="rounded-2xl border border-white/40 bg-white/40 py-3 font-mono text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md transition-transform hover:bg-white/60 active:scale-95 sm:py-3.5"
            >
              {key}
            </button>
          );
        })}
      </div>

      <div className="flex w-full flex-col gap-2">
        <Button onClick={submit} disabled={activeValue.length !== 4} className="w-full">
          {mode === 'verify' ? 'Reveal' : step === 'confirm' ? confirmLabel : 'Next'}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        )}
      </div>

      {mode === 'setup' && (
        <p className="text-center text-[11px] leading-relaxed text-muted">
          This PIN stays on your device only. It is never sent to the relay.
        </p>
      )}
    </Glass>
  );
}

/** Centers PinPad when space allows; scrolls from the top when content is taller than the screen. */
export function PinPadViewport({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-scroll
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6"
    >
      <div className="flex min-h-full flex-col items-center justify-center py-2">{children}</div>
    </div>
  );
}
