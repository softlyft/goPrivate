import { cn } from '@/utils/cn';
import { forwardRef, type InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-full border border-black/8 bg-white/55 px-4 py-2.5 text-base text-foreground outline-none',
          'placeholder:text-muted/80 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
          'transition-[border-color,box-shadow,background-color] duration-200',
          'focus:border-black/25 focus:bg-white/75 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]',
          'sm:text-sm sm:py-2.5',
          className,
        )}
        {...props}
      />
    );
  },
);
