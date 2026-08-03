'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { CreateSessionButton } from '@/components/CreateSessionButton';
import { Header } from '@/components/Header';
import { JoinSessionForm } from '@/components/JoinSessionForm';
import { Glass } from '@/components/ui/glass';

export function LandingPage() {
  return (
    <AppShell>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header
          right={
            <Link
              href="/guide"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-foreground"
            >
              How it works
            </Link>
          }
        />
        <main
          data-scroll
          className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain px-5 py-6 animate-fade-in"
        >
          <Glass
            className="w-full max-w-sm"
            contentClassName="flex flex-col items-center gap-7 px-6 py-8 text-center sm:gap-8 sm:px-8 sm:py-10"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
                Ephemeral · Encrypted
              </p>
              <h2 className="text-[2.35rem] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-5xl">
                goPrivate
              </h2>
              <p className="text-sm leading-relaxed text-muted sm:text-[15px]">
                Private chat that vanishes when you leave.
                <br />
                No accounts. No history. End-to-end encrypted.
              </p>
            </div>

            <CreateSessionButton />

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
              Set a 4-digit PIN to reveal older masked messages on your device.
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
