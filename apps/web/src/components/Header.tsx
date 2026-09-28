'use client';

import Link from 'next/link';
import { Glass } from '@/components/ui/glass';
import { BrandMark } from '@/components/BrandMark';
import { cn } from '@/utils/cn';

export function Header({
  center,
  right,
  leading,
  onHomeClick,
}: {
  title?: string;
  center?: React.ReactNode;
  right?: React.ReactNode;
  leading?: React.ReactNode;
  onHomeClick?: () => void;
}) {
  return (
    <Glass
      as="header"
      shape="none"
      className="shrink-0 rounded-none border-b border-black/[0.06] !shadow-none"
      contentClassName="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:gap-4 sm:px-4"
    >
      <div className="justify-self-start flex min-w-0 items-center gap-2">
        {leading}
        {leading ? null : onHomeClick ? (
          <button
            type="button"
            onClick={onHomeClick}
            className="flex items-center gap-2 transition-opacity hover:opacity-70"
          >
            <BrandMark />
          </button>
        ) : (
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-70">
            <BrandMark />
          </Link>
        )}
      </div>
      <div className="justify-self-center px-2 sm:px-3">{center}</div>
      <div className={cn('min-w-0 justify-self-end pl-1')}>{right}</div>
    </Glass>
  );
}
