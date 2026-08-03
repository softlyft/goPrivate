'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { CreateSessionButton } from '@/components/CreateSessionButton';
import { Header } from '@/components/Header';
import { JoinSessionForm } from '@/components/JoinSessionForm';

export function LandingPage() {
  return (
    <AppShell>
      <div className="relative flex min-h-0 flex-1 flex-col">
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
        <main className="flex flex-1 flex-col items-center justify-center px-6 animate-fade-in">
          <div className="flex w-full flex-col items-center gap-10 text-center">
            <div className="space-y-3">
              <h2 className="text-4xl font-medium tracking-tight text-foreground">goPrivate</h2>
              <p className="text-base text-muted leading-relaxed">
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
