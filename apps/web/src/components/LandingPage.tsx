'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { BrandMark } from '@/components/BrandMark';
import { ClaimHandleControl } from '@/components/ClaimHandleControl';
import { CreateSessionButton } from '@/components/CreateSessionButton';
import { SettingsControl } from '@/components/SettingsControl';
import { Header } from '@/components/Header';
import { JoinSessionForm } from '@/components/JoinSessionForm';
import { Glass } from '@/components/ui/glass';
import { useChatSession } from '@/hooks/use-chat-session';
import type { ChatRecord } from '@/store/session';
import { pinLengthLabel, SUBTITLE, TAGLINE } from '@goprivate/config';

export function LandingPage() {
  const { chats } = useChatSession();

  return (
    <AppShell>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header
          right={
            <div className="flex items-center gap-0.5">
              <SettingsControl />
              <Link
                href="/about"
                className="rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-foreground"
              >
                About
              </Link>
              <Link
                href="/guide"
                className="rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-foreground"
              >
                How it works
              </Link>
            </div>
          }
        />
        <main
          data-scroll
          className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain px-5 py-6 animate-fade-in"
        >
          <Glass
            className="my-auto w-full max-w-sm shrink-0"
            contentClassName="flex flex-col items-center gap-7 px-6 py-8 text-center sm:gap-8 sm:px-8 sm:py-10"
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <BrandMark size="lg" />
              </div>
              <p className="text-[11px] font-medium text-muted">{TAGLINE}</p>
              <p className="text-sm leading-relaxed text-muted sm:text-[15px]">{SUBTITLE}</p>
            </div>

            <ConversationInboxLink chats={chats} />

            <CreateSessionButton />

            <ClaimHandleControl />

            <div className="flex w-full flex-col items-center gap-3">
              <div className="flex w-full items-center gap-3">
                <span className="h-px flex-1 bg-black/10" />
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
                  or join
                </p>
                <span className="h-px flex-1 bg-black/10" />
              </div>
              <JoinSessionForm />
            </div>

            <p className="text-[11px] leading-relaxed text-muted">
              Set your {pinLengthLabel()} PIN in Settings once. It stays on this device.
            </p>

            <Link
              href="/guide"
              className="text-xs font-medium text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              New here? Read how it works
            </Link>
          </Glass>
        </main>
      </div>
    </AppShell>
  );
}

function ConversationInboxLink({ chats }: { chats: ChatRecord[] }) {
  if (chats.length === 0) return null;
  const unread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
  const label = chats.length === 1 ? '1 open conversation' : `${chats.length} open conversations`;

  return (
    <Link
      href="/chats"
      className="flex w-full items-center justify-between gap-3 rounded-full border border-black/8 bg-white/55 px-4 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors hover:bg-white/80"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="flex items-center gap-2 text-xs font-medium text-muted">
        {unread > 0 ? (
          <span className="min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center text-[10px] font-semibold text-accent-fg">
            {unread}
          </span>
        ) : null}
        View
      </span>
    </Link>
  );
}
