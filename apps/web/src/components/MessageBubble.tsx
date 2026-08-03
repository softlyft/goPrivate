'use client';

import { useEffect, useRef, useState } from 'react';
import type { StoredMessage } from '@/store/session';
import { messageVault } from '@/services/vault';
import { cn } from '@/utils/cn';

export type MaskLevel = 'clear' | 'soft' | 'masked';

const DOUBLE_TAP_MS = 300;
const MASK_PLACEHOLDER = '••••••••••';

function DecryptedBody({
  encryptedText,
  className,
}: {
  encryptedText: string;
  className?: string;
}) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setText(null);

    void messageVault
      .decrypt(encryptedText)
      .then((plain) => {
        if (!cancelled) setText(plain);
      })
      .catch(() => {
        if (!cancelled) setText('Unable to decrypt');
      });

    return () => {
      cancelled = true;
      setText(null);
    };
  }, [encryptedText]);

  if (text === null) {
    return <span className={cn('opacity-40', className)}>…</span>;
  }

  return <span className={className}>{text}</span>;
}

export function MessageBubble({
  message,
  maskLevel = 'clear',
  revealed = false,
  onRequestReveal,
}: {
  message: StoredMessage;
  maskLevel?: MaskLevel;
  revealed?: boolean;
  onRequestReveal?: () => void;
}) {
  const lastTapRef = useRef(0);
  const effectiveLevel: MaskLevel = revealed ? 'clear' : maskLevel;
  const showPlaintext = effectiveLevel === 'clear';
  const masked = !showPlaintext;

  function handlePointerUp() {
    if (!masked || !onRequestReveal) return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      onRequestReveal();
      return;
    }
    lastTapRef.current = now;
  }

  return (
    <div
      className={cn(
        'flex transition-[filter,opacity,transform] duration-500 ease-out',
        message.fromPeer ? 'justify-start' : 'justify-end',
        effectiveLevel === 'soft' && 'opacity-70',
        effectiveLevel === 'masked' && 'opacity-45',
      )}
    >
      <button
        type="button"
        disabled={!masked || !onRequestReveal}
        onPointerUp={handlePointerUp}
        className={cn(
          'max-w-[78%] px-4 py-2.5 text-left text-sm leading-relaxed tracking-tight',
          'rounded-[1.35rem] transition-[filter,box-shadow,transform] duration-500 ease-out',
          message.fromPeer
            ? 'rounded-bl-md border border-white/50 bg-white/55 text-foreground shadow-[var(--shadow-glass)] backdrop-blur-xl'
            : 'rounded-br-md bg-accent text-accent-fg shadow-[var(--shadow-ink)]',
          effectiveLevel === 'soft' && 'blur-[2.5px] select-none',
          effectiveLevel === 'masked' && 'blur-[5px] select-none',
          masked && onRequestReveal && 'cursor-pointer hover:ring-1 hover:ring-black/10',
          !masked && 'cursor-default',
        )}
        title={masked ? 'Double-tap to enter PIN and reveal' : undefined}
      >
        {showPlaintext ? (
          <DecryptedBody encryptedText={message.encryptedText} />
        ) : (
          <span aria-hidden>{MASK_PLACEHOLDER}</span>
        )}
      </button>
      {masked && (
        <span className="sr-only">
          Older message encrypted and masked. Double-tap to reveal with PIN.
        </span>
      )}
    </div>
  );
}
