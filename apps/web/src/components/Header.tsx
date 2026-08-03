'use client';

import Link from 'next/link';

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
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-border px-3 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 sm:px-4 sm:py-3">
      <h1 className="justify-self-start truncate text-sm font-medium tracking-tight">
        {onHomeClick ? (
          <button
            type="button"
            onClick={onHomeClick}
            className="hover:opacity-70 transition-opacity"
          >
            {title}
          </button>
        ) : (
          <Link href="/" className="hover:opacity-70 transition-opacity">
            {title}
          </Link>
        )}
      </h1>
      <div className="justify-self-center">{center}</div>
      <div className="min-w-0 justify-self-end">{right}</div>
    </header>
  );
}
