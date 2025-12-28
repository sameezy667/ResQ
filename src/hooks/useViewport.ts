/**
 * useViewport Hook
 * 
 * Provides real-time viewport breakpoint detection using matchMedia API.
 * Returns boolean flags for each breakpoint (mobile, tablet, desktop, etc.)
 * and the current breakpoint name. Updates automatically on window resize.
 * 
 * Used for responsive behaviors that cannot be handled by CSS alone
 * (e.g., conditional rendering, drawer auto-open, touch interactions).
 */

import { useState, useEffect } from 'react';

interface ViewportState {
  isMobile: boolean;      // < 640px
  isTablet: boolean;      // 640px - 1023px
  isDesktop: boolean;     // >= 1024px
  isLarge: boolean;       // >= 1280px
  width: number;
  height: number;
  breakpoint: 'mobile' | 'tablet' | 'desktop' | 'large';
}

export function useViewport(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    
    return {
      isMobile: width < 640,
      isTablet: width >= 640 && width < 1024,
      isDesktop: width >= 1024,
      isLarge: width >= 1280,
      width,
      height,
      breakpoint: width < 640 ? 'mobile' : width < 1024 ? 'tablet' : width < 1280 ? 'desktop' : 'large',
    };
  });

  useEffect(() => {
    // Media queries matching Tailwind breakpoints
    const mobileQuery = window.matchMedia('(max-width: 639px)');
    const tabletQuery = window.matchMedia('(min-width: 640px) and (max-width: 1023px)');
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const largeQuery = window.matchMedia('(min-width: 1280px)');

    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setViewport({
        isMobile: mobileQuery.matches,
        isTablet: tabletQuery.matches,
        isDesktop: desktopQuery.matches,
        isLarge: largeQuery.matches,
        width,
        height,
        breakpoint: mobileQuery.matches ? 'mobile' : 
                   tabletQuery.matches ? 'tablet' : 
                   largeQuery.matches ? 'large' : 'desktop',
      });
    };

    // Add listeners
    mobileQuery.addEventListener('change', updateViewport);
    tabletQuery.addEventListener('change', updateViewport);
    desktopQuery.addEventListener('change', updateViewport);
    largeQuery.addEventListener('change', updateViewport);

    // Update on resize (fallback)
    window.addEventListener('resize', updateViewport);

    return () => {
      mobileQuery.removeEventListener('change', updateViewport);
      tabletQuery.removeEventListener('change', updateViewport);
      desktopQuery.removeEventListener('change', updateViewport);
      largeQuery.removeEventListener('change', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  return viewport;
}
