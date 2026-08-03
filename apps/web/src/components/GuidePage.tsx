import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Header } from '@/components/Header';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-medium tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3 text-sm text-muted leading-relaxed">{children}</div>
    </section>
  );
}

export function GuidePage() {
  return (
    <AppShell>
      <Header
        title="goPrivate"
        right={
          <Link href="/" className="text-xs text-muted hover:text-foreground transition-colors">
            Back
          </Link>
        }
      />
      <main className="flex-1 overflow-y-auto px-5 py-6 animate-fade-in">
        <div className="mx-auto flex max-w-md flex-col gap-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-medium tracking-tight text-foreground">How goPrivate works</h1>
            <p>
              A private chat that disappears when you’re done. No sign-up. No profile. No saved
              history. Just you, one other person, and a short conversation that stays between you.
            </p>
          </div>

          <Section title="Who it’s for">
            <p>Use it when you want to talk privately without leaving a trail:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Sharing something sensitive for a moment</li>
              <li>A quick check-in that shouldn’t live in a normal chat app</li>
              <li>Talking on a shared or borrowed phone with extra caution</li>
            </ul>
            <p>It’s for two people. Not groups. Not broadcasting.</p>
          </Section>

          <Section title="What you can do">
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Start a private chat</h3>
                <p>
                  Tap <strong className="text-foreground font-medium">Create Session</strong>, choose
                  a 4-digit PIN, and you’ll get a link. Send that link to the one person you want to
                  talk to.
                </p>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Join someone’s chat</h3>
                <p>
                  Open the link they sent you (or paste it on the home screen and tap{' '}
                  <strong className="text-foreground font-medium">Join</strong>). You’ll set your own
                  PIN, then you’re in.
                </p>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Chat securely</h3>
                <p>
                  Once both of you are connected, messages are end-to-end encrypted. Only the two of
                  you can read them — not the service in the middle.
                </p>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">
                  Keep older messages out of sight
                </h3>
                <p>
                  Only your newest message stays easy to read. Older ones blur and hide
                  automatically, so someone glancing at your screen sees less.
                </p>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">
                  Peek at an older message (only you)
                </h3>
                <p>
                  Double-tap a hidden message and enter <strong className="text-foreground font-medium">your</strong> PIN.
                  It shows briefly, then hides again.
                </p>
                <p>
                  Your PIN lives only on your phone or computer. The other person has their own PIN.
                  Nobody else — and not goPrivate — knows it.
                </p>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Watch the clock</h3>
                <p>
                  Every chat lasts <strong className="text-foreground font-medium">15 minutes</strong>.
                  You’ll see a timer at the top. When it hits zero, the chat ends.
                </p>
                <p>
                  You can also leave anytime with{' '}
                  <strong className="text-foreground font-medium">Leave</strong>, or tap goPrivate to
                  go home.
                </p>
              </div>
            </div>
          </Section>

          <Section title="How a typical chat goes">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>You create a session and set your PIN</li>
              <li>You send the link to one person</li>
              <li>They open it and set their PIN</li>
              <li>You both chat while the timer runs</li>
              <li>You leave — and the conversation is gone</li>
            </ol>
            <p>That’s it.</p>
          </Section>

          <Section title="Good to know">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-foreground font-medium">Nothing is saved on a server for later.</strong>{' '}
                When the chat ends, it’s over.
              </li>
              <li>
                <strong className="text-foreground font-medium">No accounts.</strong> There’s nothing
                to log into or delete later.
              </li>
              <li>
                <strong className="text-foreground font-medium">One guest only.</strong> A session is
                for you and one other person.
              </li>
              <li>
                <strong className="text-foreground font-medium">Remember your PIN</strong> for that
                chat. If you forget it, you can’t unhide older messages.
              </li>
              <li>
                <strong className="text-foreground font-medium">Leaving closes your side.</strong>{' '}
                Refreshing or closing the tab disconnects you.
              </li>
            </ul>
          </Section>

          <Section title="What it doesn’t do">
            <p>goPrivate keeps things simple on purpose. It doesn’t support:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Photos, files, voice, or video</li>
              <li>Group chats</li>
              <li>Contact lists or usernames</li>
              <li>Message history after you leave</li>
              <li>Notifications after the chat is over</li>
            </ul>
            <p>
              If you need those, a regular messaging app is a better fit. If you need a short,
              private, vanishing chat — you’re in the right place.
            </p>
          </Section>

          <Section title="A quick privacy promise">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Your messages are encrypted in transit so the relay can’t read them</li>
              <li>Messages are also encrypted on your device — inspecting app storage won’t show chat text</li>
              <li>We don’t ask who you are</li>
              <li>We don’t keep your chats after the session ends</li>
              <li>Your reveal PIN never leaves your device; it unlocks local decryption</li>
            </ul>
            <p className="pt-1 text-foreground">
              Talk freely. Leave when you’re done. Nothing sticks around.
            </p>
          </Section>

          <Link
            href="/"
            className="mb-4 inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            Back to home
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
