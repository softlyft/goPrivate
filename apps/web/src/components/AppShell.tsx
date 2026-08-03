'use client';

import { cn } from '@/utils/cn';
import { useAppViewport } from '@/hooks/use-app-viewport';

/**
 * On mobile: fills the entire device screen (no side gutters, no page scroll).
 * On larger screens: centered phone column (~430px).
 */
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
      className={cn(
        'fixed left-0 top-0 z-0 flex justify-center overflow-hidden bg-background',
        'sm:bg-[#ececec]',
      )}
      style={{
        width: 'var(--app-width, 100vw)',
        height: 'var(--app-height, 100dvh)',
      }}
    >
      <div
        className={cn(
          'flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden bg-background',
          // Desktop / tablet: phone frame. Mobile: full device width.
          'max-w-none sm:max-w-[430px] sm:shadow-lg',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
