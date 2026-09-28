'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ConversationList } from '@/components/ConversationList';
import { CreateSessionButton } from '@/components/CreateSessionButton';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Glass } from '@/components/ui/glass';
import { useChatSession } from '@/hooks/use-chat-session';

export function ConversationsPage() {
  const router = useRouter();
  const { chats } = useChatSession();

  return (
    <AppShell className="animate-fade-in">
      <Header
        right={
          <Link
            href="/"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-foreground"
          >
            Home
          </Link>
        }
      />
      <main
        data-scroll
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 py-6"
      >
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Inbox</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Open conversations
            </h1>
            <p className="text-sm leading-relaxed text-muted">
              Each chat is still 1:1. Leave one without closing the others.
            </p>
          </div>

          <Glass contentClassName="flex flex-col gap-4 px-4 py-4">
            <ConversationList
              chats={chats}
              heading={null}
              emptyText="No open conversations yet. Start one, or join a link from home."
              onOpen={(id) => router.push(`/chat/${id}`)}
            />
          </Glass>

          <CreateSessionButton />

          <Button variant="secondary" onClick={() => router.push('/')} className="w-full">
            Back home
          </Button>
        </div>
      </main>
    </AppShell>
  );
}
