import { cn } from '@/utils/cn';

/** Centers content in a phone-width column (~430px). */
export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh justify-center bg-[#ececec]">
      <div
        className={cn(
          'flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-[0_0_0_1px_rgba(0,0,0,0.04)] sm:shadow-lg',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
