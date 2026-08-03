import { cn } from '@/utils/cn';
import type { InputHTMLAttributes } from 'react';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        // text-base (16px) prevents iOS Safari from zooming the page on focus
        'w-full rounded-md border border-border bg-surface px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted focus:border-foreground sm:text-sm sm:py-2',
        className,
      )}
      {...props}
    />
  );
}
