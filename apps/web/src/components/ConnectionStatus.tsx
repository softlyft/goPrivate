import type { ConnectionStatus as Status } from '@goprivate/sdk';
import { cn } from '@/utils/cn';

const labels: Record<Status, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Connected',
  awaiting_partner: 'Waiting for partner',
  handshaking: 'Establishing encryption…',
  ready: 'Encrypted',
  error: 'Error',
  expired: 'Expired',
};

const shortLabels: Record<Status, string> = {
  disconnected: 'Offline',
  connecting: 'Connecting',
  connected: 'Connected',
  awaiting_partner: 'Waiting',
  handshaking: 'Encrypting',
  ready: 'Encrypted',
  error: 'Error',
  expired: 'Expired',
};

const colors: Record<Status, string> = {
  disconnected: 'bg-muted',
  connecting: 'bg-foreground/40',
  connected: 'bg-foreground/40',
  awaiting_partner: 'bg-foreground/40',
  handshaking: 'bg-foreground/40',
  ready: 'bg-success',
  error: 'bg-danger',
  expired: 'bg-danger',
};

export function ConnectionStatus({ status }: { status: Status }) {
  return (
    <div className="flex max-w-[7.5rem] items-center gap-1.5 rounded-full border border-black/6 bg-white/40 px-2 py-1 text-xs text-muted backdrop-blur-md sm:max-w-none sm:gap-2 sm:px-2.5">
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          colors[status],
          (status === 'connecting' || status === 'handshaking' || status === 'awaiting_partner') &&
            'animate-pulse',
        )}
      />
      <span className="truncate sm:hidden" title={labels[status]}>
        {shortLabels[status]}
      </span>
      <span className="hidden sm:inline">{labels[status]}</span>
    </div>
  );
}
