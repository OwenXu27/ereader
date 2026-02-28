import { useState, useEffect } from 'react';

// Treat anything up to and including 840px as "mobile/tablet single-column"
const MOBILE_BREAKPOINT = 840;

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth;
    return width <= MOBILE_BREAKPOINT ||
      ('ontouchstart' in window && width <= 1024);
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
};
