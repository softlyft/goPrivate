'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function SessionTimer({
  expiresAt,
  onExpire,
}: {
  expiresAt: number | null;
  onExpire?: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(() =>
    expiresAt ? Math.max(0, expiresAt - Date.now()) : null,
  );

  useEffect(() => {
    if (!expiresAt) {
      setRemainingMs(null);
      return;
    }

    let expiredFired = false;

    function tick() {
      const left = Math.max(0, expiresAt! - Date.now());
      setRemainingMs(left);
      if (left <= 0 && !expiredFired) {
        expiredFired = true;
        onExpire?.();
      }
    }

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [expiresAt, onExpire]);

  if (remainingMs === null) return null;

  const urgent = remainingMs <= 5 * 60 * 1000;

  return (
    <div
      className={cn(
        'font-mono text-sm tabular-nums tracking-tight',
        urgent
          ? 'rounded-full bg-red-50/80 px-2 py-0.5 text-danger'
          : 'rounded-full bg-white/40 px-2 py-0.5 text-muted backdrop-blur-md',
      )}
      title="Session ends automatically after 15 minutes"
      aria-live="polite"
      aria-label={`Session time remaining ${formatRemaining(remainingMs)}`}
    >
      {formatRemaining(remainingMs)}
    </div>
  );
}
