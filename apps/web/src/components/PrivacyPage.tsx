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

export function PrivacyPage() {
  const lastUpdated = 'September 30, 2026';

  return (
    <AppShell>
      <Header
        title="Privacy Policy"
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
              Privacy Policy
            </h1>
            <p className="text-sm leading-relaxed text-muted">Last updated: {lastUpdated}</p>
          </Glass>

          <Section title="Introduction">
            <p>
              {APP_NAME} is designed for private, ephemeral communication. This Privacy Policy
              explains what data we collect, why we collect it, and how we handle it.
            </p>
            <p>
              <strong className="font-medium text-foreground">Our core principle:</strong> We do not
              collect, store, or have access to your conversation content. Your messages are
              end-to-end encrypted and disappear when sessions expire.
            </p>
          </Section>

          <Section title="Information We Do NOT Collect">
            <p>We explicitly do not collect:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="font-medium text-foreground">Message content</strong> — Your chat
                text is end-to-end encrypted and only visible to participants
              </li>
              <li>
                <strong className="font-medium text-foreground">Personal identity</strong> — No
                accounts, profiles, email addresses, or phone numbers
              </li>
              <li>
                <strong className="font-medium text-foreground">Message history</strong> — Sessions
                are destroyed after 30 minutes; nothing is archived
              </li>
              <li>
                <strong className="font-medium text-foreground">Your PIN</strong> — Your reveal PIN
                never leaves your device
              </li>
              <li>
                <strong className="font-medium text-foreground">Device storage</strong> — We cannot
                inspect your local message vault or settings
              </li>
            </ul>
          </Section>

          <Section title="Information We Do Collect">
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">
                  1. Relay Server Logs (Temporary)
                </h3>
                <p>Our relay server temporarily processes:</p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    <strong className="font-medium text-foreground">IP addresses</strong> — For rate
                    limiting and abuse prevention (not logged long-term)
                  </li>
                  <li>
                    <strong className="font-medium text-foreground">Session IDs</strong> — Ephemeral
                    identifiers that expire with the session
                  </li>
                  <li>
                    <strong className="font-medium text-foreground">Connection timestamps</strong> —
                    For session lifecycle management only
                  </li>
                  <li>
                    <strong className="font-medium text-foreground">Encrypted payloads</strong> —
                    The relay forwards encrypted messages without decrypting them
                  </li>
                </ul>
                <p className="mt-2 rounded-lg bg-black/5 px-3 py-2 text-xs">
                  <strong className="font-medium text-foreground">Important:</strong> These logs are
                  kept in memory only and are discarded when sessions expire. We do not write them
                  to persistent storage.
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">
                  2. Analytics (Home Page Only)
                </h3>
                <p>
                  The public home page may load Google Analytics to measure visitor traffic. This
                  helps us understand whether the free public relay is being used.
                </p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    <strong className="font-medium text-foreground">What is tracked:</strong> Page
                    views, rough location, device type
                  </li>
                  <li>
                    <strong className="font-medium text-foreground">What is NOT tracked:</strong>{' '}
                    Chat pages, message content, PINs, or conversation metadata
                  </li>
                  <li>
                    <strong className="font-medium text-foreground">Anonymization:</strong> IP
                    addresses are anonymized where supported by Google Analytics
                  </li>
                </ul>
                <p className="mt-2 rounded-lg bg-black/5 px-3 py-2 text-xs">
                  <strong className="font-medium text-foreground">Note:</strong> Analytics scripts
                  are only loaded on marketing pages, never during active chat sessions.
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">
                  3. Payment Information (Premium Plans)
                </h3>
                <p>If you purchase a Premium plan:</p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    USDT transactions are processed on-chain; we only see your payment address
                  </li>
                  <li>
                    We store your reserved handle and the lease key (encrypted, stored on your
                    device)
                  </li>
                  <li>Payment confirmation is manual; you contact us to activate your plan</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section title="How We Use Information">
            <p>The limited data we temporarily process is used only for:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="font-medium text-foreground">Operating the relay</strong> —
                Routing encrypted messages between participants
              </li>
              <li>
                <strong className="font-medium text-foreground">Rate limiting</strong> — Preventing
                abuse and ensuring fair access
              </li>
              <li>
                <strong className="font-medium text-foreground">Session management</strong> —
                Enforcing 30-minute session lifetimes
              </li>
              <li>
                <strong className="font-medium text-foreground">Service improvement</strong> —
                Understanding aggregate usage patterns (not individual conversations)
              </li>
            </ul>
          </Section>

          <Section title="Data Sharing">
            <p>
              <strong className="font-medium text-foreground">
                We do not sell, rent, or share your data
              </strong>{' '}
              with third parties, except:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="font-medium text-foreground">Google Analytics</strong> (home page
                only) — Subject to Google&apos;s privacy policy
              </li>
              <li>
                <strong className="font-medium text-foreground">Legal obligations</strong> — If
                required by law, though we have minimal data to provide
              </li>
              <li>
                <strong className="font-medium text-foreground">Service providers</strong> —
                Hosting/infrastructure partners bound by confidentiality agreements
              </li>
            </ul>
          </Section>

          <Section title="Data Security">
            <p>We implement multiple layers of protection:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="font-medium text-foreground">End-to-end encryption</strong> —
                ECDH P-256 key exchange + AES-GCM-256 for messages
              </li>
              <li>
                <strong className="font-medium text-foreground">Local PIN vault</strong> — Your PIN
                protects a device-local vault using PBKDF2 (600,000 iterations)
              </li>
              <li>
                <strong className="font-medium text-foreground">TLS/WSS</strong> — All relay
                connections use encrypted WebSocket connections
              </li>
              <li>
                <strong className="font-medium text-foreground">No persistent storage</strong> —
                Session data lives in memory only and expires automatically
              </li>
              <li>
                <strong className="font-medium text-foreground">Open source</strong> — The protocol
                and reference implementation are auditable (AGPLv3)
              </li>
            </ul>
          </Section>

          <Section title="Your Rights and Choices">
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">
                  No Account = No Data Requests
                </h3>
                <p>
                  Because {APP_NAME} does not create accounts or store persistent user data, there
                  is nothing to access, correct, or delete. Your data disappears automatically when
                  sessions expire.
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Device-Local Data</h3>
                <p>Data stored only on your device (PIN vault, settings) can be cleared by:</p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>Clearing your browser&apos;s local storage</li>
                  <li>Uninstalling the mobile app</li>
                  <li>Using your device&apos;s app data clearing feature</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">
                  Opting Out of Analytics
                </h3>
                <p>
                  Use browser extensions that block Google Analytics, or visit only the app pages
                  (not the marketing home page).
                </p>
              </div>
            </div>
          </Section>

          <Section title="Children's Privacy">
            <p>
              {APP_NAME} does not knowingly collect information from children under 13. Because we
              do not collect personal information, we cannot determine the age of users. If you
              believe a child has used the service, please contact us.
            </p>
          </Section>

          <Section title="International Users">
            <p>
              {APP_NAME} is operated from [Your Jurisdiction]. By using the service, you consent to
              the transfer of your data (session metadata, IP addresses) to our servers. We comply
              with applicable data protection laws, including GDPR where relevant.
            </p>
            <p>
              <strong className="font-medium text-foreground">GDPR Note:</strong> Because we do not
              store personal data long-term, most GDPR rights (access, portability, erasure) are
              moot. Session data self-destructs after 30 minutes.
            </p>
          </Section>

          <Section title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted at this
              URL with an updated &ldquo;Last updated&rdquo; date. Continued use of {APP_NAME} after changes
              constitutes acceptance of the revised policy.
            </p>
          </Section>

          <Section title="Contact Us">
            <p>Questions about this Privacy Policy? Contact us:</p>
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
              <strong className="font-medium text-foreground">Summary:</strong> {APP_NAME} is built
              for privacy. We do not see your messages, do not know who you are, and do not keep
              conversation history. Sessions self-destruct after 30 minutes. Your PIN stays on your
              device.
            </p>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
