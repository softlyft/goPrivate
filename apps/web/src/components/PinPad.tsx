'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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
  /** Shown when parent rejects a verify attempt (e.g. wrong vault PIN). */
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
      // Parent verifies against the vault (no plaintext PIN comparison here)
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
    <div className="flex w-full max-w-xs flex-col items-center gap-6 animate-fade-in">
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-medium tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted leading-relaxed">{subtitle}</p>}
        <p className="text-xs text-muted">{stepLabel}</p>
      </div>

      <div
        className={cn('flex gap-3', shake && 'animate-pin-shake')}
        aria-label="PIN digits"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-3 w-3 rounded-full border border-border transition-colors',
              i < activeValue.length ? 'bg-foreground border-foreground' : 'bg-transparent',
            )}
          />
        ))}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="grid w-full grid-cols-3 gap-2">
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
                className="rounded-md py-3 text-sm text-muted hover:bg-bubble-peer"
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
              className="rounded-md py-3 font-mono text-lg hover:bg-bubble-peer"
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
        <p className="text-center text-[11px] text-muted leading-relaxed">
          This PIN stays on your device only. It is never sent to the relay.
        </p>
      )}
    </div>
  );
}
