'use client';

import { useEffect } from 'react';

/**
 * Locks the document to the visible viewport and marks mobile for layout.
 * Height/width track visualViewport so the shell matches the device screen
 * (and shrinks with the on-screen keyboard).
 */
export function useAppViewport(): void {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const sync = () => {
      const vv = window.visualViewport;
      const height = Math.round(vv?.height ?? window.innerHeight);
      const width = Math.round(vv?.width ?? window.innerWidth);

      root.style.setProperty('--app-height', `${height}px`);
      root.style.setProperty('--app-width', `${width}px`);

      if (vv && (vv.offsetTop !== 0 || window.scrollY !== 0)) {
        window.scrollTo(0, 0);
      }

      const mobile =
        window.matchMedia('(max-width: 480px)').matches ||
        window.matchMedia('(pointer: coarse) and (max-width: 900px)').matches;
      root.dataset.mobile = mobile ? 'true' : 'false';
    };

    sync();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);

    body.style.position = 'fixed';
    body.style.inset = '0';
    body.style.width = '100%';
    body.style.height = 'var(--app-height, 100%)';
    body.style.overflow = 'hidden';

    return () => {
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      body.style.position = '';
      body.style.inset = '';
      body.style.width = '';
      body.style.height = '';
      body.style.overflow = '';
    };
  }, []);
}
