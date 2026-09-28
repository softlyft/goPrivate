'use client';

import {
  HANDLE_ALLOWLIST,
  concurrentChatLimitHint,
  isAllowedHandle,
  normalizeHandle,
  sessionTtlLabel,
} from '@goprivate/config';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PinPad, PinPadViewport } from '@/components/PinPad';
import { useChatSession } from '@/hooks/use-chat-session';
import {
  clearPreferredHandle,
  loadHandleLease,
  loadPreferredHandle,
  saveHandleLeaseFromPaste,
} from '@/services/handle-lease';
import { messageVault } from '@/services/vault';
import { getHandleShareUrl } from '@/utils/env';

export function ClaimHandleControl() {
  const { claimedHandle, claimHandle, unclaimHandle, unlockOrSetupVault } = useChatSession();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(HANDLE_ALLOWLIST[0] ?? '');
  const [preferredHandle, setPreferredHandle] = useState<string | null>(null);
  const [hasStoredLease, setHasStoredLease] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [leasePaste, setLeasePaste] = useState('');
  const displayHandle = claimedHandle ?? preferredHandle;
  const shareUrl = displayHandle ? getHandleShareUrl(displayHandle) : '';

  useEffect(() => {
    const remembered = loadPreferredHandle();
    if (!remembered) return;
    setPreferredHandle(remembered);
    setValue(remembered);
    setHasStoredLease(Boolean(loadHandleLease(remembered)));
  }, []);

  useEffect(() => {
    if (!claimedHandle) return;
    setPreferredHandle(claimedHandle);
    setValue(claimedHandle);
    setHasStoredLease(Boolean(loadHandleLease(claimedHandle)));
    setOpen(true);
  }, [claimedHandle]);

  async function goAvailable(handle: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await claimHandle(handle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not go available');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(): Promise<void> {
    const handle = normalizeHandle(value);
    if (!handle) return;
    if (leasePaste.trim()) {
      try {
        saveHandleLeaseFromPaste(handle, leasePaste);
        setHasStoredLease(true);
        setLeasePaste('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save lease key');
        return;
      }
    } else if (!loadHandleLease(handle) && !isAllowedHandle(handle)) {
      setError(
        HANDLE_ALLOWLIST.length > 0
          ? 'This instance only allows reserved names'
          : 'Use a short name like alice (letters, numbers, hyphens)',
      );
      return;
    }
    if (!messageVault.isUnlocked) {
      setShowPin(true);
      return;
    }
    await goAvailable(handle);
  }

  async function handlePin(pin: string): Promise<void> {
    try {
      await unlockOrSetupVault(pin);
      setShowPin(false);
      await goAvailable(normalizeHandle(value));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unlock PIN');
      setShowPin(false);
    }
  }

  function forgetName(): void {
    clearPreferredHandle();
    setPreferredHandle(null);
    setHasStoredLease(false);
    setValue(HANDLE_ALLOWLIST[0] ?? '');
    setLeasePaste('');
    setError(null);
    setOpen(false);
  }

  const pinOverlay = showPin ? (
    <div className="absolute inset-0 z-20 flex min-h-0 flex-col bg-background/55 backdrop-blur-xl animate-fade-in">
      <PinPadViewport>
        <PinPad
          title={messageVault.hasVault ? 'Enter your PIN' : 'Set reveal PIN'}
          subtitle="Needed to receive chats on this name."
          confirmLabel="Go available"
          onComplete={(pin) => void handlePin(pin)}
          onCancel={() => setShowPin(false)}
          mode={messageVault.hasVault ? 'verify' : 'setup'}
        />
      </PinPadViewport>
    </div>
  ) : null;

  if (claimedHandle) {
    return (
      <>
        <HandleLinkCard
          kicker="Available as"
          url={shareUrl}
          hint={`${concurrentChatLimitHint(true)} People can open this link while this tab stays connected. Closing it takes the name offline — this is not an inbox. Come back here to go available again; this browser keeps the name and key.`}
          copied={copied}
          busy={busy}
          error={error}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              setError('Could not copy');
            }
          }}
          actionLabel="Go offline"
          onAction={() => {
            setBusy(true);
            void unclaimHandle().finally(() => setBusy(false));
          }}
        />
        {pinOverlay}
      </>
    );
  }

  if (preferredHandle) {
    return (
      <>
        <HandleLinkCard
          kicker="Your lasting link"
          url={shareUrl}
          hint={
            hasStoredLease
              ? 'This browser still has your name and key. Go available to receive chats — you will not need the private key again.'
              : 'This browser still has your name. Go available to receive chats.'
          }
          copied={copied}
          busy={busy}
          error={error}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              setError('Could not copy');
            }
          }}
          actionLabel={busy ? 'Connecting…' : 'Go available'}
          onAction={() => void handleSubmit()}
          secondaryLabel="Use a different name"
          onSecondary={forgetName}
        />
        {pinOverlay}
      </>
    );
  }

  return (
    <>
      {open ? (
        <div className="flex w-full flex-col gap-2">
          <Input
            value={value}
            onChange={(event) => {
              const next = event.target.value;
              setValue(next);
              setError(null);
              const handle = normalizeHandle(next);
              setHasStoredLease(Boolean(handle && loadHandleLease(handle)));
            }}
            placeholder="your-name"
            aria-label="Lasting link name"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {hasStoredLease ? (
            <p className="text-[11px] leading-relaxed text-muted">
              This browser already has the key for this name.
            </p>
          ) : (
            <textarea
              value={leasePaste}
              onChange={(event) => setLeasePaste(event.target.value)}
              placeholder="Lease key from your operator (optional unless this name is reserved)"
              aria-label="Handle lease key"
              rows={3}
              className="w-full rounded-2xl border border-black/8 bg-white/55 px-4 py-2.5 text-xs text-foreground outline-none placeholder:text-muted/80"
            />
          )}
          {error ? <p className="text-[11px] text-danger">{error}</p> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={busy || !value.trim()}
              onClick={() => void handleSubmit()}
            >
              {busy ? 'Connecting…' : 'Go available'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            Works only while you stay online. Reserved names need a time-limited lease key from the
            operator. Visitors start a normal {sessionTtlLabel()} chat.{' '}
            {concurrentChatLimitHint(false)}
          </p>
        </div>
      ) : (
        <button
          type="button"
          className="text-xs font-medium text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline"
          onClick={() => setOpen(true)}
        >
          Use a lasting link
        </button>
      )}

      {pinOverlay}
    </>
  );
}

function HandleLinkCard({
  kicker,
  url,
  hint,
  copied,
  busy,
  error,
  onCopy,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  kicker: string;
  url: string;
  hint: string;
  copied: boolean;
  busy: boolean;
  error: string | null;
  onCopy: () => void;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-black/8 bg-white/40 px-4 py-3 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{kicker}</p>
      <p className="break-all text-sm font-medium text-foreground">{url}</p>
      <p className="text-[11px] leading-relaxed text-muted">{hint}</p>
      {error ? <p className="text-[11px] text-danger">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="secondary" className="min-w-24" onClick={onCopy}>
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
      {secondaryLabel && onSecondary ? (
        <button
          type="button"
          className="text-[11px] font-medium text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline"
          onClick={onSecondary}
        >
          {secondaryLabel}
        </button>
      ) : null}
    </div>
  );
}
