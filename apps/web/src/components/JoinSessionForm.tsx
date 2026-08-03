'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function extractSessionId(input: string): string {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    const chatIndex = parts.indexOf('chat');
    if (chatIndex >= 0 && parts[chatIndex + 1]) {
      return parts[chatIndex + 1]!;
    }
  } catch {
    // not a URL — treat as raw session id
  }
  const match = trimmed.match(/\/chat\/([a-f0-9]+)/i);
  if (match?.[1]) return match[1];
  return trimmed;
}

export function JoinSessionForm() {
  const router = useRouter();
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const sessionId = extractSessionId(value);
    if (!sessionId) return;
    router.push(`/chat/${sessionId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste link or session ID"
        aria-label="Session link or ID"
      />
      <Button type="submit" variant="secondary" disabled={!value.trim()} className="shrink-0">
        Join
      </Button>
    </form>
  );
}
