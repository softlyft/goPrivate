'use client';

import { cn } from '@/utils/cn';
import { useAppViewport } from '@/hooks/use-app-viewport';

/** Full-height phone column that fits the visible mobile browser viewport. */
export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  useAppViewport();

  return (
    <div
      className="fixed inset-x-0 z-0 flex justify-center bg-[#ececec]"
      style={{
        top: 'var(--app-offset, 0px)',
        height: 'var(--app-height, 100dvh)',
      }}
    >
      <div
        className={cn(
          'flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-background',
          'pt-[env(safe-area-inset-top)]',
          'shadow-[0_0_0_1px_rgba(0,0,0,0.04)] sm:shadow-lg',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
