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
    <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border px-4 py-3">
      <h1 className="justify-self-start text-sm font-medium tracking-tight">
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
      <div className="justify-self-end">{right}</div>
    </header>
  );
}
