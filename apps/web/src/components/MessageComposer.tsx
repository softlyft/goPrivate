'use client';

import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || disabled || sending) return;
    setSending(true);
    try {
      await onSend(value);
      setText('');
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? 'Waiting for secure channel…' : 'Type a message'}
        disabled={disabled || sending}
        enterKeyHint="send"
        autoComplete="off"
        autoCorrect="on"
        autoCapitalize="sentences"
      />
      <Button type="submit" disabled={disabled || sending || !text.trim()}>
        Send
      </Button>
    </form>
  );
}
