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

const colors: Record<Status, string> = {
  disconnected: 'bg-muted',
  connecting: 'bg-amber-400',
  connected: 'bg-amber-400',
  awaiting_partner: 'bg-amber-400',
  handshaking: 'bg-amber-400',
  ready: 'bg-success',
  error: 'bg-danger',
  expired: 'bg-danger',
};

export function ConnectionStatus({ status }: { status: Status }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span className={cn('h-1.5 w-1.5 rounded-full', colors[status])} />
      <span>{labels[status]}</span>
    </div>
  );
}
