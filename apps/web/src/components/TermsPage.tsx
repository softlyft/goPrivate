import Link from 'next/link';
import { APP_NAME, OPERATOR_CONTACT_HANDLE } from '@goprivate/config';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';
import { Glass } from '@/components/ui/glass';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Glass contentClassName="space-y-3 px-5 py-5">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </Glass>
  );
}

export function TermsPage() {
  const lastUpdated = 'September 30, 2026';

  return (
    <AppShell>
      <Header
        title="Terms of Service"
        right={
          <Link
            href="/"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-foreground"
          >
            Back
          </Link>
        }
      />
      <main
        data-scroll
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 animate-fade-in sm:px-5"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-10">
          <Glass contentClassName="space-y-2 px-5 py-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">Legal</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Terms of Service
            </h1>
            <p className="text-sm leading-relaxed text-muted">Last updated: {lastUpdated}</p>
          </Glass>

          <Section title="Agreement to Terms">
            <p>
              By accessing or using {APP_NAME} (the &ldquo;Service&rdquo;), you agree to be bound by these Terms
              of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, do not use the Service.
            </p>
            <p>
              <strong className="font-medium text-foreground">Important:</strong> {APP_NAME} is
              designed for ephemeral, private communication. Messages and sessions are automatically
              destroyed after 30 minutes. We cannot recover deleted conversations.
            </p>
          </Section>

          <Section title="Description of Service">
            <p>{APP_NAME} provides:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="font-medium text-foreground">Ephemeral 1:1 chat</strong> —
                Private conversations that expire after 30 minutes
              </li>
              <li>
                <strong className="font-medium text-foreground">End-to-end encryption</strong> —
                Messages encrypted between participants using ECDH P-256 + AES-GCM-256
              </li>
              <li>
                <strong className="font-medium text-foreground">No accounts</strong> — Use the
                Service without creating a profile or persistent identity
              </li>
              <li>
                <strong className="font-medium text-foreground">Session links</strong> — One-time
                share links or lasting names (Premium)
              </li>
              <li>
                <strong className="font-medium text-foreground">Multi-chat support</strong> — Up to
                3 concurrent chats (Free) or 7 (Premium with lasting name)
              </li>
            </ul>
          </Section>

          <Section title="Eligibility">
            <p>You must:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Be at least 13 years of age to use the Service</li>
              <li>Have the legal capacity to enter into these Terms</li>
              <li>Not be prohibited from using the Service under applicable laws or regulations</li>
            </ul>
          </Section>

          <Section title="Account-Free Use">
            <p>{APP_NAME} does not require accounts. You are responsible for:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="font-medium text-foreground">Your device PIN</strong> — This
                unlocks your local message vault and never leaves your device
              </li>
              <li>
                <strong className="font-medium text-foreground">Session links</strong> — Anyone with
                a session link can join that conversation
              </li>
              <li>
                <strong className="font-medium text-foreground">Lasting name lease keys</strong> —
                Premium users must safeguard their lease key
              </li>
            </ul>
            <p>
              <strong className="font-medium text-foreground">
                We cannot recover lost PINs or lease keys.
              </strong>{' '}
              If you forget your PIN, you cannot decrypt older messages. If you lose your lease key,
              you cannot reclaim your reserved handle.
            </p>
          </Section>

          <Section title="Acceptable Use">
            <p>You agree NOT to use {APP_NAME} to:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Violate any local, state, national, or international law</li>
              <li>Harass, threaten, or harm others, or incite violence</li>
              <li>Transmit spam, malware, or any harmful code</li>
              <li>Impersonate any person or entity, or falsely claim affiliation</li>
              <li>Interfere with or disrupt the Service, servers, or networks</li>
              <li>
                Attempt to bypass rate limits, gain unauthorized access, or exploit vulnerabilities
              </li>
              <li>Use automated tools (bots, scrapers) without permission</li>
              <li>Share child sexual abuse material (CSAM) or exploit minors</li>
              <li>Engage in human trafficking, terrorism, or other serious crimes</li>
            </ul>
            <p className="mt-2 rounded-lg bg-black/5 px-3 py-2 text-xs">
              <strong className="font-medium text-foreground">Enforcement:</strong> We monitor for
              abuse patterns (e.g., excessive session creation, rate limit violations). Violators
              may be rate-limited or IP-blocked. Because messages are end-to-end encrypted, we
              cannot see conversation content, but we will cooperate with lawful requests from
              authorities.
            </p>
          </Section>

          <Section title="Premium Plans">
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Payment</h3>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    Premium plans are billed in USDT (Tether) via on-chain cryptocurrency
                    transactions
                  </li>
                  <li>Prices are listed on the marketing page and may change with notice</li>
                  <li>
                    Payment is manual: you send USDT to our address, then contact us to activate
                    your plan
                  </li>
                  <li>By paying, you agree to these Terms and authorize the charge</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Refunds</h3>
                <p>
                  <strong className="font-medium text-foreground">
                    Cryptocurrency payments are non-refundable.
                  </strong>{' '}
                  Once USDT is sent, we cannot reverse the transaction. Premium plans are not
                  refunded for:
                </p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>Change of mind</li>
                  <li>Failure to use the Service</li>
                  <li>Termination due to Terms violations</li>
                </ul>
                <p>
                  Refunds may be considered in cases of technical service failure lasting more than
                  7 consecutive days, at our sole discretion.
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Lasting Names</h3>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    Premium subscribers receive a reserved handle (e.g., &ldquo;alice&rdquo;) for inbound calls
                  </li>
                  <li>
                    Handles are subject to availability and must comply with our naming policy (no
                    offensive, misleading, or trademarked names)
                  </li>
                  <li>We reserve the right to reclaim handles that violate these Terms</li>
                  <li>Your lease key is stored on your device; we cannot recover it if lost</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Cancellation</h3>
                <p>
                  You may cancel a Premium subscription at any time by discontinuing use. No refund
                  will be issued for the current billing period. Your handle expires when your paid
                  term ends.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Intellectual Property">
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Our Rights</h3>
                <p>
                  The {APP_NAME} name, logo, branding, and design are protected by intellectual
                  property laws. The reference implementation and protocol are open source under
                  AGPLv3. See{' '}
                  <a
                    href="https://github.com/softlyft/goPrivate"
                    className="text-foreground underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    github.com/softlyft/goPrivate
                  </a>{' '}
                  for licensing details.
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Your Content</h3>
                <p>
                  You retain ownership of messages you send. By using the Service, you grant us a
                  temporary license to transmit your encrypted messages through our relay.
                </p>
                <p>
                  <strong className="font-medium text-foreground">Important:</strong> Because
                  messages are end-to-end encrypted, we cannot access, moderate, or remove content.
                  You are solely responsible for what you share.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Privacy and Data">
            <p>
              Your use of {APP_NAME} is governed by our{' '}
              <Link
                href="/privacy"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Privacy Policy
              </Link>
              . Key points:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>We do not see your message content (end-to-end encrypted)</li>
              <li>Sessions expire after 30 minutes and are deleted</li>
              <li>No message history is archived</li>
              <li>Temporary relay logs (IP, session metadata) are kept in memory only</li>
            </ul>
          </Section>

          <Section title="Service Availability">
            <p>
              <strong className="font-medium text-foreground">
                {APP_NAME} is provided &ldquo;as is&rdquo; without guarantees of uptime or availability.
              </strong>
            </p>
            <p>We may:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Suspend or terminate the Service for maintenance, upgrades, or at our discretion
              </li>
              <li>Change features, limits, or pricing with reasonable notice</li>
              <li>
                Discontinue the hosted Service entirely (though the open protocol remains available
                for self-hosting)
              </li>
            </ul>
          </Section>

          <Section title="Disclaimers and Limitation of Liability">
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">No Warranty</h3>
                <p className="uppercase">
                  THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
                  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
                  FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
                </p>
                <p>
                  We do not guarantee that the Service will be error-free, secure, or uninterrupted.
                  Use at your own risk.
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">
                  Limitation of Liability
                </h3>
                <p className="uppercase">
                  TO THE FULLEST EXTENT PERMITTED BY LAW, {APP_NAME.toUpperCase()} AND ITS OPERATORS
                  SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE
                  DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE
                  SERVICE.
                </p>
                <p>
                  If liability cannot be excluded, it is limited to the amount you paid for the
                  Service in the 12 months before the claim (or $100 USD if you used the free plan).
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Security Limitations</h3>
                <p>
                  While {APP_NAME} uses industry-standard encryption, no system is perfectly secure.
                  You acknowledge that:
                </p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    Encryption relies on the relay being honest during key exchange (TOFU model)
                  </li>
                  <li>A compromised device can expose messages stored in the local vault</li>
                  <li>Screen observation or device sharing defeats message scrambling</li>
                  <li>We cannot prevent screenshots or photos of your screen</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section title="Indemnification">
            <p>
              You agree to indemnify and hold harmless {APP_NAME}, its operators, and contributors
              from any claims, damages, or expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any law or third-party rights</li>
              <li>Content you transmit through the Service</li>
            </ul>
          </Section>

          <Section title="Termination">
            <p>
              You may stop using {APP_NAME} at any time by closing your sessions. We may suspend or
              ban your IP address if you violate these Terms, without refund.
            </p>
            <p>
              Upon termination, your right to use the Service ends immediately. Because we do not
              store message history, there is no account or data to delete.
            </p>
          </Section>

          <Section title="Dispute Resolution and Governing Law">
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Governing Law</h3>
                <p>
                  These Terms are governed by the laws of [Your Jurisdiction], without regard to
                  conflict of law principles.
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Arbitration</h3>
                <p>
                  Any disputes arising from these Terms or your use of the Service shall be resolved
                  through binding arbitration, except where prohibited by law. You waive the right
                  to a jury trial or class action.
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Exceptions</h3>
                <p>
                  Either party may seek injunctive relief in court to prevent infringement of
                  intellectual property or disclosure of confidential information.
                </p>
              </div>
            </div>
          </Section>

          <Section title="General Provisions">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="font-medium text-foreground">Entire Agreement:</strong> These
                Terms, together with the Privacy Policy, constitute the entire agreement between you
                and {APP_NAME}.
              </li>
              <li>
                <strong className="font-medium text-foreground">Severability:</strong> If any
                provision is found unenforceable, the rest of the Terms remain in effect.
              </li>
              <li>
                <strong className="font-medium text-foreground">No Waiver:</strong> Our failure to
                enforce any provision does not waive our right to do so later.
              </li>
              <li>
                <strong className="font-medium text-foreground">Assignment:</strong> You may not
                transfer your rights under these Terms. We may assign them to a successor.
              </li>
              <li>
                <strong className="font-medium text-foreground">Updates:</strong> We may update
                these Terms by posting a new version with an updated date. Continued use after
                changes constitutes acceptance.
              </li>
            </ul>
          </Section>

          <Section title="Open Source and Self-Hosting">
            <p>
              {APP_NAME} is an open protocol licensed under AGPLv3. These Terms apply only to the
              hosted Service at this domain. If you self-host the reference implementation, you
              operate your own relay and are responsible for compliance with applicable laws.
            </p>
            <p>
              See{' '}
              <a
                href="https://github.com/softlyft/goPrivate"
                className="text-foreground underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                github.com/softlyft/goPrivate
              </a>{' '}
              for the source code and self-hosting documentation.
            </p>
          </Section>

          <Section title="Contact Us">
            <p>Questions about these Terms? Contact us:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="font-medium text-foreground">Via the app:</strong>{' '}
                <Link
                  href={`/${OPERATOR_CONTACT_HANDLE}`}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {OPERATOR_CONTACT_HANDLE}
                </Link>{' '}
                (if available)
              </li>
              <li>
                <strong className="font-medium text-foreground">GitHub:</strong>{' '}
                <a
                  href="https://github.com/softlyft/goPrivate"
                  className="text-foreground underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/softlyft/goPrivate
                </a>
              </li>
            </ul>
          </Section>

          <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-xs leading-relaxed text-muted">
            <p>
              <strong className="font-medium text-foreground">In Short:</strong> Use {APP_NAME}{' '}
              lawfully and responsibly. We provide ephemeral, encrypted chat without accounts or
              message history. Premium plans are non-refundable. We disclaim liability to the
              fullest extent of the law. These Terms may change; check back periodically.
            </p>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
