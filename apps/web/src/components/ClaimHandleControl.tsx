'use client';

import {
  HANDLE_ALLOWLIST,
  isAllowedHandle,
  normalizeHandle,
  sessionTtlLabel,
} from '@goprivate/config';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PinPad, PinPadViewport } from '@/components/PinPad';
import { useChatSession } from '@/hooks/use-chat-session';
import { saveHandleLeaseFromPaste } from '@/services/handle-lease';
import { messageVault } from '@/services/vault';
import { getHandleShareUrl } from '@/utils/env';

export function ClaimHandleControl() {
  const { claimedHandle, claimHandle, unclaimHandle, setupVault } = useChatSession();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(HANDLE_ALLOWLIST[0] ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [leasePaste, setLeasePaste] = useState('');
  const shareUrl = claimedHandle ? getHandleShareUrl(claimedHandle) : '';

  useEffect(() => {
    if (claimedHandle) setOpen(true);
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save lease key');
        return;
      }
    } else if (!isAllowedHandle(handle)) {
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
      await setupVault(pin);
      setShowPin(false);
      await goAvailable(normalizeHandle(value));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set PIN');
      setShowPin(false);
    }
  }

  if (claimedHandle) {
    return (
      <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-black/8 bg-white/40 px-4 py-3 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          Available as
        </p>
        <p className="break-all text-sm font-medium text-foreground">{shareUrl}</p>
        <p className="text-[11px] leading-relaxed text-muted">
          People can open this link while this tab stays connected. If you leave, the name goes
          offline — this is not an inbox.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-w-24"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                setError('Could not copy');
              }
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void unclaimHandle().finally(() => setBusy(false));
            }}
          >
            Go offline
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {open ? (
        <div className="flex w-full flex-col gap-2">
          <Input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            placeholder="your-name"
            aria-label="Lasting link name"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <textarea
            value={leasePaste}
            onChange={(event) => setLeasePaste(event.target.value)}
            placeholder="Lease key from your operator (optional unless this name is reserved)"
            aria-label="Handle lease key"
            rows={3}
            className="w-full rounded-2xl border border-black/8 bg-white/55 px-4 py-2.5 text-xs text-foreground outline-none placeholder:text-muted/80"
          />
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
            operator. Visitors start a normal {sessionTtlLabel()} chat.
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

      {showPin ? (
        <div className="absolute inset-0 z-20 flex min-h-0 flex-col bg-background/55 backdrop-blur-xl animate-fade-in">
          <PinPadViewport>
            <PinPad
              title="Set reveal PIN"
              subtitle="Needed to receive chats on this name."
              confirmLabel="Go available"
              onComplete={(pin) => void handlePin(pin)}
              onCancel={() => setShowPin(false)}
              mode="setup"
            />
          </PinPadViewport>
        </div>
      ) : null}
    </>
  );
}
