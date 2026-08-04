'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Glass } from '@/components/ui/glass';

const SUPPORT_URL =
  process.env.NEXT_PUBLIC_SUPPORT_URL ?? 'https://github.com/sponsors/softlyft';


export function ConversationEnded({ onHome }: { onHome: () => void }) {
  const support = (
    <span className="inline-flex items-center gap-1.5 font-medium tracking-tight text-foreground">
      <span aria-hidden>❤️</span>
      Support goPrivate
    </span>
  );

  return (
    <div
      data-scroll
      className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain px-5 py-8 animate-fade-in"
    >
      <Glass
        className="w-full max-w-sm"
        contentClassName="flex flex-col items-center gap-6 px-6 py-8 text-center sm:px-8 sm:py-10"
      >
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[1.75rem]">
            Conversation destroyed.
          </h2>
          <ul className="space-y-1.5 text-sm leading-relaxed text-muted">
            <li>No messages stored.</li>
            <li>No account created.</li>
            <li>No data sold.</li>
          </ul>
          <p className="mx-auto max-w-[18rem] text-sm leading-relaxed text-muted">
            This public relay is funded entirely by people who believe private communication should
            remain free.
          </p>
          <Link
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex justify-center transition-opacity hover:opacity-80"
          >
            {support}
          </Link>
        </div>

        <Button type="button" variant="secondary" onClick={onHome} className="mt-1 w-full">
          Back home
        </Button>
      </Glass>
    </div>
  );
}
