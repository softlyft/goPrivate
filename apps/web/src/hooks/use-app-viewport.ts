'use client';

import { useEffect } from 'react';

/**
 * Keeps the app column sized to the *visible* browser viewport on mobile
 * (address bar, home indicator, and on-screen keyboard).
 */
export function useAppViewport(): void {
  useEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      const vv = window.visualViewport;
      const height = Math.round(vv?.height ?? window.innerHeight);
      const offset = Math.round(vv?.offsetTop ?? 0);

      root.style.setProperty('--app-height', `${height}px`);
      root.style.setProperty('--app-offset', `${offset}px`);

      const coarse =
        window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(max-width: 480px)').matches;
      root.dataset.mobile = coarse ? 'true' : 'false';
    };

    sync();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);

    return () => {
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);
}
