'use client';

import Image from 'next/image';
import { APP_NAME, APP_NAME_LEAD, APP_NAME_REST, COLOR, WEB_LOGO_SRC } from '@goprivate/config';
import { cn } from '@/utils/cn';

export function BrandMark({
  size = 'sm',
  showLogo = true,
}: {
  size?: 'sm' | 'lg';
  showLogo?: boolean;
}) {
  const logo = size === 'lg' ? 112 : 32;
  return (
    <span className={cn('flex items-center gap-2', size === 'lg' && 'flex-col')}>
      {showLogo ? (
        <Image
          src={WEB_LOGO_SRC}
          alt={APP_NAME}
          width={logo}
          height={logo}
          className={
            size === 'lg' ? 'h-24 w-auto rounded-2xl shadow-lg sm:h-28' : 'h-8 w-8 rounded-lg'
          }
          priority={size === 'lg'}
        />
      ) : null}
      <span
        className={
          size === 'lg'
            ? 'text-[2.35rem] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-5xl'
            : 'text-sm font-semibold tracking-tight'
        }
      >
        {APP_NAME_LEAD ? <span style={{ color: COLOR.green }}>{APP_NAME_LEAD}</span> : null}
        <span style={{ color: COLOR.dark }}>{APP_NAME_REST}</span>
      </span>
    </span>
  );
}
