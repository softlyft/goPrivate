'use client';

import { useEffect, useRef, useState } from 'react';
import type { StoredMessage } from '@/store/session';
import { messageVault } from '@/services/vault';
import { cn } from '@/utils/cn';

export type MaskLevel = 'clear' | 'soft' | 'masked';

const DOUBLE_TAP_MS = 300;

/** Fixed mask — never derives from plaintext (would leak length / content). */
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
        'flex transition-[filter,opacity] duration-500 ease-out',
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
          'max-w-[75%] rounded-2xl px-3.5 py-2 text-left text-sm leading-relaxed transition-[filter] duration-500 ease-out',
          message.fromPeer
            ? 'bg-bubble-peer text-foreground'
            : 'bg-bubble-self text-accent-fg',
          effectiveLevel === 'soft' && 'blur-[2.5px] select-none',
          effectiveLevel === 'masked' && 'blur-[5px] select-none',
          masked && onRequestReveal && 'cursor-pointer hover:ring-1 hover:ring-border',
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
        <span className="sr-only">Older message encrypted and masked. Double-tap to reveal with PIN.</span>
      )}
    </div>
  );
}
