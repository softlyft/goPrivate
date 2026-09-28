'use client';

import type { ChatRecord } from '@/store/session';
import { ConnectionStatus } from '@/components/ConnectionStatus';

function shortId(sessionId: string): string {
  return sessionId.slice(0, 8);
}

function remainingLabel(expiresAt: number | null): string | null {
  if (!expiresAt) return null;
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 'Ending';
  const mins = Math.max(1, Math.ceil(ms / 60_000));
  return `${mins} min left`;
}

export function ConversationList({
  chats,
  onOpen,
  heading = 'Open conversations',
  emptyText,
}: {
  chats: ChatRecord[];
  onOpen: (sessionId: string) => void;
  heading?: string | null;
  emptyText?: string;
}) {
  if (chats.length === 0) {
    if (!emptyText) return null;
    return <p className="w-full text-center text-sm text-muted">{emptyText}</p>;
  }

  return (
    <div className="flex w-full flex-col gap-2 text-left">
      {heading ? (
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">{heading}</p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {chats.map((chat) => {
          const remaining = remainingLabel(chat.expiresAt);
          return (
            <li key={chat.sessionId}>
              <button
                type="button"
                onClick={() => onOpen(chat.sessionId)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-black/8 bg-white/55 px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors hover:bg-white/80"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-foreground">
                    {shortId(chat.sessionId)}…
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {remaining ?? (chat.partnerPresent ? 'Partner connected' : 'Waiting')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {chat.unreadCount > 0 ? (
                    <span className="min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center text-[10px] font-semibold text-accent-fg">
                      {chat.unreadCount}
                    </span>
                  ) : null}
                  <ConnectionStatus status={chat.status} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
