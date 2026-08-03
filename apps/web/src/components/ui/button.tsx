import { cn } from '@/utils/cn';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';

const variants: Record<Variant, string> = {
  primary:
    'btn-sheen bg-accent text-accent-fg shadow-[var(--shadow-ink)] hover:brightness-110 active:scale-[0.98]',
  secondary:
    'border border-black/8 bg-white/55 text-foreground backdrop-blur-xl shadow-[var(--shadow-glass)] hover:bg-white/75 active:scale-[0.98]',
  ghost: 'bg-transparent text-muted hover:text-foreground hover:bg-black/[0.04]',
  danger: 'bg-transparent text-danger hover:bg-red-50/80',
  glass:
    'border border-white/40 bg-white/30 text-foreground backdrop-blur-xl shadow-[var(--shadow-glass)] hover:bg-white/45 active:scale-[0.98]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ className, variant = 'primary', disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium tracking-tight transition-[transform,opacity,filter,background-color] duration-200 disabled:cursor-not-allowed disabled:opacity-40',
        variants[variant],
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );
}
