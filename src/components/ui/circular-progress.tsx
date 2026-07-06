// src/components/ui/circular-progress.tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface CircularProgressProps extends React.SVGProps<SVGSVGElement> {
  value?: number;
  size?: number;
  strokeWidth?: number;
  text?: string;
  textSize?: string;
}

const CircularProgress = React.forwardRef<SVGSVGElement, CircularProgressProps>(
  (
    { className, value = 0, size = 100, strokeWidth = 8, text, textSize = 'text-xl', ...props },
    ref
  ) => {
    const r = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * r;
    // Ensure offset doesn't go beyond circumference
    const offset = Math.max(0, circumference - (value / 100) * circumference);

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          ref={ref}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={cn('transform -rotate-90', className)}
          {...props}
        >
          {/* Background Circle */}
          <circle
            className="text-muted/50"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            r={r}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress Circle */}
          <circle
            className="text-primary"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            r={r}
            cx={size / 2}
            cy={size / 2}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 0.5s ease-out',
            }}
          />
        </svg>
        {text && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('font-bold text-primary', textSize)}>{text}</span>
          </div>
        )}
      </div>
    );
  }
);
CircularProgress.displayName = 'CircularProgress';

export { CircularProgress };
