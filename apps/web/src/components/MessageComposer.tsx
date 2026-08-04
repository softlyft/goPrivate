'use client';

import { type FormEvent, type MouseEvent, type PointerEvent, useRef, useState } from 'react';
import { MAX_CHAT_TEXT_CHARS } from '@goprivate/protocol';
import { Button } from '@/components/ui/button';
import { Glass } from '@/components/ui/glass';
import { Input } from '@/components/ui/input';

export function MessageComposer({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function keepKeyboardOpen(e: PointerEvent | MouseEvent) {
    // Prevent the control from taking focus so the input (and soft keyboard) stay active.
    e.preventDefault();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || disabled || sending) return;
    if (value.length > MAX_CHAT_TEXT_CHARS) {
      setLocalError(`Max ${MAX_CHAT_TEXT_CHARS} characters`);
      return;
    }

    setSending(true);
    setLocalError(null);
    setText('');
    inputRef.current?.focus();

    try {
      await onSend(value);
    } catch (err) {
      setText(value);
      setLocalError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
      // Re-focus after React updates / any transient disable so iOS/Android keep the keyboard up.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  return (
    <Glass
      shape="none"
      className="shrink-0 rounded-none border-t border-black/[0.06] !shadow-none"
      contentClassName="px-3 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:px-4"
    >
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-1.5">
        <div className="flex w-full gap-2">
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value.slice(0, MAX_CHAT_TEXT_CHARS));
              setLocalError(null);
            }}
            placeholder={disabled ? 'Waiting for secure channel…' : 'Type a message'}
            disabled={disabled}
            maxLength={MAX_CHAT_TEXT_CHARS}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
          />
          <Button
            type="submit"
            disabled={disabled || sending || !text.trim()}
            className="shrink-0 px-5"
            onMouseDown={keepKeyboardOpen}
            onPointerDown={keepKeyboardOpen}
          >
            Send
          </Button>
        </div>
        {localError && <p className="px-1 text-[11px] text-danger">{localError}</p>}
      </form>
    </Glass>
  );
}
