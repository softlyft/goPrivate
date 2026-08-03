'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { CreateSessionButton } from '@/components/CreateSessionButton';
import { Header } from '@/components/Header';
import { JoinSessionForm } from '@/components/JoinSessionForm';

export function LandingPage() {
  return (
    <AppShell>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header
          right={
            <Link
              href="/guide"
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              How it works
            </Link>
          }
        />
        <main
          data-scroll
          className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain px-6 py-4 animate-fade-in"
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center sm:gap-10">
            <div className="space-y-2 sm:space-y-3">
              <h2 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                goPrivate
              </h2>
              <p className="text-sm text-muted leading-relaxed sm:text-base">
                Private chat that vanishes when you leave.
                <br />
                No accounts. No history. End-to-end encrypted.
              </p>
              <p className="text-xs text-muted">
                Set a 4-digit PIN to reveal older masked messages on your device.
              </p>
            </div>

            <CreateSessionButton />

            <div className="flex w-full flex-col items-center gap-3">
              <p className="text-xs uppercase tracking-widest text-muted">or join a session</p>
              <JoinSessionForm />
            </div>

            <Link
              href="/guide"
              className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline transition-colors"
            >
              New here? Read how goPrivate works
            </Link>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
