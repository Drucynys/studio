'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface LazySectionProps {
  children: React.ReactNode;
  defaultHeight?: number;
  className?: string;
}

export function LazySection({ children, defaultHeight = 350, className }: LazySectionProps) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [height, setHeight] = useState(defaultHeight);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If IntersectionObserver is not supported, just render children directly
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsIntersecting(true);
      return;
    }

    // Increase root margin on larger screens to preload more aggressively
    const isDesktop = window.innerWidth >= 1024;
    const isTablet = window.innerWidth >= 768;
    const dynamicRootMargin = isDesktop ? '1500px 0px' : isTablet ? '1000px 0px' : '600px 0px';

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        rootMargin: dynamicRootMargin,
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      observer.disconnect();
    };
  }, []);

  // Monitor actual height of children when visible to prevent layout shift on unmount
  useEffect(() => {
    if (!isIntersecting || typeof window === 'undefined' || !('ResizeObserver' in window)) return;

    const currentRef = ref.current;
    if (!currentRef) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const measuredHeight = entry.target.getBoundingClientRect().height;
        if (measuredHeight > 0) {
          setHeight(measuredHeight);
        }
      }
    });

    resizeObserver.observe(currentRef);
    return () => {
      if (currentRef) {
        resizeObserver.unobserve(currentRef);
      }
      resizeObserver.disconnect();
    };
  }, [isIntersecting]);

  return (
    <div
      ref={ref}
      style={{ minHeight: isIntersecting ? undefined : `${height}px` }}
      className={cn("w-full transition-all duration-300", className)}
    >
      {isIntersecting ? (
        children
      ) : (
        <div
          style={{ height: `${height}px` }}
          className="w-full bg-white/40 dark:bg-white/5 rounded-2xl border border-white/40 dark:border-white/10 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-pulse flex items-center justify-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 animate-ping opacity-50" />
        </div>
      )}
    </div>
  );
}
