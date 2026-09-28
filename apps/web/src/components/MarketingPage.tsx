'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  APP_NAME,
  DESCRIPTION,
  FREE_MAX_CONCURRENT_CHATS,
  OPERATOR_CONTACT_HANDLE,
  PREMIUM_MAX_CONCURRENT_CHATS,
  PREMIUM_PRICE_USDT_MONTHLY,
  PREMIUM_YEARLY_DISCOUNT,
  SUPPORT_LABEL,
  SUPPORT_URL,
  TAGLINE,
  USDT_PAYMENT_ADDRESS,
  formatUsdt,
  pinLengthLabel,
  premiumPriceUsdtYearly,
  publicHandleUrl,
  sessionTtlLabel,
} from '@goprivate/config';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { AmbientCanvas, Glass } from '@/components/ui/glass';
import { useAppViewport } from '@/hooks/use-app-viewport';
import { cn } from '@/utils/cn';

const YEARLY_USDT = premiumPriceUsdtYearly();
const YEARLY_MONTHLY_USDT = Math.round((YEARLY_USDT / 12) * 10) / 10;
const YEARLY_OFF_PERCENT = Math.round(PREMIUM_YEARLY_DISCOUNT * 100);

const FEATURES = [
  {
    title: 'End-to-end encrypted',
    body: 'Once both participants connect, message content is encrypted on device. A standard relay cannot read it.',
  },
  {
    title: 'No accounts',
    body: 'No profiles, directories, or stored inboxes. Share a one-time link, or a lasting name while you are online.',
  },
  {
    title: `${sessionTtlLabel()}, then gone`,
    body: 'Each conversation has a fixed lifetime. When it ends, the session is destroyed. Nothing is kept for later.',
  },
  {
    title: `${pinLengthLabel()} PIN on your device`,
    body: 'Older messages are masked on screen. Your PIN unwraps them locally and never leaves the device.',
  },
] as const;

function operatorContactPath(): string {
  return `/${OPERATOR_CONTACT_HANDLE}`;
}

export function MarketingPage() {
  useAppViewport();
  const [yearly, setYearly] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contactHref, setContactHref] = useState(operatorContactPath());
  const [contactLabel, setContactLabel] = useState(publicHandleUrl(OPERATOR_CONTACT_HANDLE));
  const premiumAmount = yearly ? YEARLY_USDT : PREMIUM_PRICE_USDT_MONTHLY;

  useEffect(() => {
    const origin = window.location.origin;
    setContactHref(operatorContactPath());
    setContactLabel(`${origin}${operatorContactPath()}`);
  }, []);

  useEffect(() => {
    if (!payOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPayOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [payOpen]);

  async function copyAddress(): Promise<void> {
    try {
      await navigator.clipboard.writeText(USDT_PAYMENT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed left-0 top-0 z-0 overflow-y-auto overflow-x-hidden overscroll-contain bg-background"
      style={{
        width: 'var(--app-width, 100vw)',
        height: 'var(--app-height, 100dvh)',
      }}
      data-scroll
    >
      <div className="relative min-h-full">
        <AmbientCanvas />
        <div className="relative z-[1] mx-auto flex w-full max-w-5xl flex-col px-5 pb-16 pt-4 sm:px-8 sm:pb-24 sm:pt-6">
          <header className="flex items-center justify-between gap-3 py-2">
            <BrandMark />
            <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Link
                href="#pricing"
                className="rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-foreground"
              >
                Pricing
              </Link>
              <Link
                href="/guide"
                className="rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-foreground"
              >
                How it works
              </Link>
              <Link
                href="/"
                className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg shadow-[var(--shadow-ink)] transition-[filter] hover:brightness-110"
              >
                Open app
              </Link>
            </nav>
          </header>

          <section className="flex flex-col items-center py-14 text-center sm:py-20">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">{TAGLINE}</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
              Private 1:1 chat that disappears.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">{DESCRIPTION}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex min-w-40 items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg shadow-[var(--shadow-ink)] transition-[filter] hover:brightness-110"
              >
                Start a conversation
              </Link>
              <Link
                href="#pricing"
                className="inline-flex min-w-40 items-center justify-center rounded-full border border-black/8 bg-white/55 px-5 py-2.5 text-sm font-medium text-foreground shadow-[var(--shadow-glass)] backdrop-blur-xl transition-colors hover:bg-white/75"
              >
                View plans
              </Link>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <Glass key={feature.title} contentClassName="space-y-2 px-5 py-5 sm:px-6">
                <h2 className="text-base font-semibold tracking-tight text-foreground">{feature.title}</h2>
                <p className="text-sm leading-relaxed text-muted">{feature.body}</p>
              </Glass>
            ))}
          </section>

          <section id="pricing" className="scroll-mt-8 pt-16 sm:pt-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">Pricing</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground">
                Hosted plans, settled in USDT
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                The protocol remains open. These plans apply to the hosted {APP_NAME} service. Premium is{' '}
                {formatUsdt(PREMIUM_PRICE_USDT_MONTHLY)} per month, or {YEARLY_OFF_PERCENT}% less when billed
                annually.
              </p>
              <div className="mt-6 inline-flex rounded-full border border-black/8 bg-white/55 p-1 shadow-[var(--shadow-glass)]">
                <button
                  type="button"
                  className={cn(
                    'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                    yearly ? 'text-muted hover:text-foreground' : 'bg-accent text-accent-fg',
                  )}
                  onClick={() => setYearly(false)}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                    yearly ? 'bg-accent text-accent-fg' : 'text-muted hover:text-foreground',
                  )}
                  onClick={() => setYearly(true)}
                >
                  Annual · {YEARLY_OFF_PERCENT}% off
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <PlanCard
                name="Free"
                price="0 USDT"
                cadence="No charge"
                cta="Open the app"
                href="/"
                features={[
                  `${FREE_MAX_CONCURRENT_CHATS} concurrent conversations`,
                  'One-time share links',
                  `${sessionTtlLabel()} session lifetime`,
                  'End-to-end encryption',
                  'No reserved lasting name',
                ]}
              />
              <PlanCard
                name="Premium"
                highlight
                price={yearly ? formatUsdt(YEARLY_USDT) : formatUsdt(PREMIUM_PRICE_USDT_MONTHLY)}
                cadence={
                  yearly
                    ? `Billed annually · ${formatUsdt(YEARLY_MONTHLY_USDT)} / month`
                    : 'Billed monthly'
                }
                badge={yearly ? `${YEARLY_OFF_PERCENT}% off` : 'Recommended'}
                cta="Pay with USDT"
                onCta={() => setPayOpen(true)}
                features={[
                  'Reserved lasting name',
                  `${PREMIUM_MAX_CONCURRENT_CHATS} concurrent conversations`,
                  'Lease key stored on your device',
                  'Settled in USDT',
                  yearly
                    ? `${formatUsdt(YEARLY_USDT)} charged once per year`
                    : `${formatUsdt(PREMIUM_PRICE_USDT_MONTHLY)} charged each month`,
                ]}
              />
              <PlanCard
                name="Custom"
                price="On request"
                cadence="Managed by goPrivate, or self-hosted"
                cta="Discuss your requirements"
                href={contactHref}
                features={[
                  'Managed relay, or you operate your own',
                  'Custom name, branding, and limits',
                  'Open protocol with no vendor lock-in',
                  'Self-host with Docker Compose',
                  `Contact us at ${contactLabel} to discuss your needs`,
                ]}
              />
            </div>
            <p className="mx-auto mt-6 max-w-2xl text-center text-[11px] leading-relaxed text-muted">
              Self-hosting the reference implementation remains available under AGPLv3. Hosted Premium
              and Custom plans support the public relay.
            </p>
          </section>

          <footer className="mt-16 flex flex-col items-center gap-3 border-t border-black/8 pt-8 text-center sm:mt-20">
            <BrandMark showLogo={false} />
            <p className="max-w-md text-xs leading-relaxed text-muted">
              {APP_NAME} is an open protocol for ephemeral 1:1 communication. Hosted plans keep the
              public relay available.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-medium">
              <Link href="/" className="text-foreground/70 underline-offset-4 hover:underline">
                App
              </Link>
              <Link href="/guide" className="text-foreground/70 underline-offset-4 hover:underline">
                Guide
              </Link>
              <Link
                href={contactHref}
                className="text-foreground/70 underline-offset-4 hover:underline"
              >
                Contact
              </Link>
              <a
                href={SUPPORT_URL}
                className="text-foreground/70 underline-offset-4 hover:underline"
                rel="noreferrer"
                target="_blank"
              >
                {SUPPORT_LABEL}
              </a>
            </div>
          </footer>
        </div>

        {payOpen ? (
          <div
            className="fixed inset-0 z-30 flex items-center justify-center bg-background/70 px-4 backdrop-blur-xl animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="usdt-pay-title"
            onClick={() => setPayOpen(false)}
          >
            <div
              className="w-full max-w-md"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <Glass contentClassName="flex flex-col gap-4 px-6 py-7 sm:px-8">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                  Premium · USDT
                </p>
                <h3
                  id="usdt-pay-title"
                  className="text-xl font-semibold tracking-tight text-foreground"
                >
                  Complete payment
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  Send <span className="font-medium text-foreground">{formatUsdt(premiumAmount)}</span>{' '}
                  to the address below. Once the transfer is confirmed, contact us at{' '}
                  <Link
                    href={contactHref}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {contactLabel}
                  </Link>{' '}
                  to receive your lasting-name lease key.
                </p>
                <div className="rounded-2xl border border-black/8 bg-white/55 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                    USDT address
                  </p>
                  <p className="mt-1 break-all font-mono text-xs leading-relaxed text-foreground">
                    {USDT_PAYMENT_ADDRESS}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void copyAddress()}>
                    {copied ? 'Address copied' : 'Copy address'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setPayOpen(false)}>
                    Close
                  </Button>
                </div>
              </Glass>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  cadence,
  features,
  cta,
  href,
  onCta,
  highlight,
  badge,
}: {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  cta: string;
  href?: string;
  onCta?: () => void;
  highlight?: boolean;
  badge?: string;
}) {
  const className = cn(
    'inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium',
    highlight
      ? 'bg-accent text-accent-fg shadow-[var(--shadow-ink)] hover:brightness-110'
      : 'border border-black/8 bg-white/55 text-foreground shadow-[var(--shadow-glass)] hover:bg-white/75',
  );

  return (
    <Glass
      className={cn(highlight && 'ring-2 ring-accent/35')}
      contentClassName="flex h-full flex-col gap-4 px-5 py-6 sm:px-6"
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">{name}</p>
          {badge ? (
            <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{price}</p>
        <p className="text-xs text-muted">{cadence}</p>
      </div>
      <ul className="flex flex-1 flex-col gap-2 text-sm leading-relaxed text-muted">
        {features.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {onCta ? (
        <button type="button" className={className} onClick={onCta}>
          {cta}
        </button>
      ) : href ? (
        <Link href={href} className={className}>
          {cta}
        </Link>
      ) : null}
    </Glass>
  );
}
