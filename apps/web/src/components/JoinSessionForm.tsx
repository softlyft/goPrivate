'use client';

import { SESSION_ID_PATTERN } from '@goprivate/protocol';
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
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const sessionId = extractSessionId(value);
    if (!sessionId) return;
    if (!SESSION_ID_PATTERN.test(sessionId)) {
      setError('Enter a valid session link or ID');
      return;
    }
    setError(null);
    router.push(`/chat/${sessionId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-1.5">
      <div className="flex w-full gap-2">
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="Paste link or session ID"
          aria-label="Session link or ID"
        />
        <Button type="submit" variant="secondary" disabled={!value.trim()} className="shrink-0">
          Join
        </Button>
      </div>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </form>
  );
}
