'use client';

import Link from 'next/link';
import { Glass } from '@/components/ui/glass';
import { cn } from '@/utils/cn';

export function Header({
  title = 'goPrivate',
  center,
  right,
  onHomeClick,
}: {
  title?: string;
  center?: React.ReactNode;
  right?: React.ReactNode;
  onHomeClick?: () => void;
}) {
  return (
    <Glass
      as="header"
      shape="none"
      className="shrink-0 rounded-none border-b border-black/[0.06] !shadow-none"
      contentClassName="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:gap-4 sm:px-4"
    >
      <h1 className="justify-self-start truncate text-sm font-semibold tracking-tight">
        {onHomeClick ? (
          <button
            type="button"
            onClick={onHomeClick}
            className="transition-opacity hover:opacity-70"
          >
            {title}
          </button>
        ) : (
          <Link href="/" className="transition-opacity hover:opacity-70">
            {title}
          </Link>
        )}
      </h1>
      <div className="justify-self-center px-2 sm:px-3">{center}</div>
      <div className={cn('min-w-0 justify-self-end pl-1')}>{right}</div>
    </Glass>
  );
}
