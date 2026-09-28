'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Glass } from '@/components/ui/glass';
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
            <Image
              src="/logo.jpg"
              alt="goPrivate"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg"
            />
            <span className="text-sm font-semibold tracking-tight">
              <span style={{ color: '#169e6b' }}>go</span>
              <span style={{ color: '#1a4d3d' }}>Private</span>
            </span>
          </button>
        ) : (
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-70">
            <Image
              src="/logo.jpg"
              alt="goPrivate"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg"
            />
            <span className="text-sm font-semibold tracking-tight">
              <span style={{ color: '#169e6b' }}>go</span>
              <span style={{ color: '#1a4d3d' }}>Private</span>
            </span>
          </Link>
        )}
      </div>
      <div className="justify-self-center px-2 sm:px-3">{center}</div>
      <div className={cn('min-w-0 justify-self-end pl-1')}>{right}</div>
    </Glass>
  );
}
