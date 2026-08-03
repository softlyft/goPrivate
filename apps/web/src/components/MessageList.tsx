'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageBubble, type MaskLevel } from '@/components/MessageBubble';
import { PinPad } from '@/components/PinPad';
import { messageVault } from '@/services/vault';
import type { StoredMessage } from '@/store/session';

const CLEAR_COUNT = 1;
const SOFT_COUNT = 1;
const REVEAL_MS = 8_000;

function maskLevelFor(index: number, total: number): MaskLevel {
  const fromEnd = total - 1 - index;
  if (fromEnd < CLEAR_COUNT) return 'clear';
  if (fromEnd < CLEAR_COUNT + SOFT_COUNT) return 'soft';
  return 'masked';
}

export function MessageList({
  messages,
  vaultReady,
}: {
  messages: StoredMessage[];
  vaultReady: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [pendingRevealId, setPendingRevealId] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const timers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const id of activeTimers.values()) {
        window.clearTimeout(id);
      }
    };
  }, []);

  function revealMessage(messageId: string) {
    setRevealedIds((prev) => new Set(prev).add(messageId));
    const existing = timers.current.get(messageId);
    if (existing) window.clearTimeout(existing);

    const timer = window.setTimeout(() => {
      setRevealedIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
      timers.current.delete(messageId);
    }, REVEAL_MS);

    timers.current.set(messageId, timer);
  }

  async function handlePinSuccess(pin: string) {
    try {
      const ok = await messageVault.verifyPin(pin);
      if (!ok) {
        setPinError(`Incorrect PIN (${Date.now()})`);
        return;
      }
      setPinError(null);
      if (pendingRevealId) {
        revealMessage(pendingRevealId);
      }
      setPendingRevealId(null);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'PIN check failed');
    }
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-4" data-scroll>
        <p className="text-sm text-muted text-center">
          Messages appear here once the channel is ready.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-4" data-scroll>
      {messages.map((message, index) => {
        const level = maskLevelFor(index, messages.length);
        const revealed = revealedIds.has(message.id);
        return (
          <MessageBubble
            key={message.id}
            message={message}
            maskLevel={level}
            revealed={revealed}
            onRequestReveal={
              level !== 'clear' && vaultReady
                ? () => {
                    setPinError(null);
                    setPendingRevealId(message.id);
                  }
                : undefined
            }
          />
        );
      })}
      <div ref={bottomRef} />

      {pendingRevealId && vaultReady && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/50 px-6 backdrop-blur-xl animate-fade-in">
          <PinPad
            title="Reveal message"
            subtitle="Enter your reveal PIN to decrypt this message temporarily."
            mode="verify"
            externalError={pinError}
            onComplete={(pin) => void handlePinSuccess(pin)}
            onCancel={() => {
              setPendingRevealId(null);
              setPinError(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
