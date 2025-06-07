
"use client";

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card as ShadcnCard } from '@/components/ui/card';

const MAX_ROTATION = 8; // Max tilt rotation in degrees
const MIN_DIMENSION_FOR_TILT_EFFECT = 40; // Minimum card dimension to enable tilt

interface TiltableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  perspective?: number; // Custom perspective value for the 3D effect
}

export function TiltableCard({
  children,
  className, // This className is for the underlying ShadcnCard
  perspective = 1000,
  ...props // Other props for the underlying ShadcnCard (e.g., onClick)
}: TiltableCardProps) {
  const tiltTargetRef = useRef<HTMLDivElement>(null); // Ref for the inner div that actually tilts

  const [isHovering, setIsHovering] = useState(false);
  // Stores mouse position relative to the tiltTargetRef element
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  // Stores dimensions of the tiltTargetRef element
  const [cardDimensions, setCardDimensions] = useState({ width: 1, height: 1 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // e.currentTarget is the perspective div (the root of TiltableCard)
    if (!tiltTargetRef.current) {
      if (isHovering) setIsHovering(false);
      return;
    }

    const tiltElement = tiltTargetRef.current;
    const currentWidth = tiltElement.offsetWidth;
    const currentHeight = tiltElement.offsetHeight;

    // Disable tilt if card is too small (e.g., during resize or if content is minimal)
    if (
      currentWidth <= MIN_DIMENSION_FOR_TILT_EFFECT ||
      currentHeight <= MIN_DIMENSION_FOR_TILT_EFFECT
    ) {
      if (isHovering) setIsHovering(false); // Reset hover state if too small
      return;
    }
    
    // Update dimensions if they've changed
    if (cardDimensions.width !== currentWidth || cardDimensions.height !== currentHeight) {
      setCardDimensions({ width: currentWidth, height: currentHeight });
    }

    if (!isHovering) setIsHovering(true);

    const rect = tiltElement.getBoundingClientRect(); // Get bounds of the element that will tilt
    setMousePosition({
      x: e.clientX - rect.left, // Mouse X relative to the top-left of the tiltElement
      y: e.clientY - rect.top,  // Mouse Y relative to the top-left of the tiltElement
    });
  }, [isHovering, cardDimensions.width, cardDimensions.height]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  let tiltTransform = "rotateX(0deg) rotateY(0deg)"; // Default (no tilt)

  if (
    isHovering &&
    cardDimensions.width > MIN_DIMENSION_FOR_TILT_EFFECT &&
    cardDimensions.height > MIN_DIMENSION_FOR_TILT_EFFECT
  ) {
    const centerX = cardDimensions.width / 2;
    const centerY = cardDimensions.height / 2;
    const mouseXFromCenter = mousePosition.x - centerX;
    const mouseYFromCenter = mousePosition.y - centerY;

    const rotateY = (mouseXFromCenter / centerX) * MAX_ROTATION;
    const rotateX = (mouseYFromCenter / centerY) * -MAX_ROTATION; // Inverted for natural feel
    tiltTransform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }

  const tiltStyle: React.CSSProperties = {
    transform: tiltTransform,
    transformStyle: "preserve-3d",
    transition: "transform 0.05s linear", // Fast transition for responsive tilt
    width: '100%', 
    height: '100%',
    display: 'flex', // Ensure inner div behaves like a block and fills content area
    flexDirection: 'column', // Stack children vertically if needed
  };

  return (
    <div 
      style={{ perspective: `${perspective}px` }} // Applies 3D perspective to the container
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      // This outer div captures mouse events for the tilt effect.
      // It does not take external className or ...props directly to avoid conflicts.
    >
      <ShadcnCard
        className={cn(
            // Default bounce/zoom and other base card styles are applied here via className prop
            // Example: "transform transition-all duration-200 ease-out hover:scale-105 hover:-translate-y-1"
            className 
        )}
        {...props} // Passes onClick, etc., to the ShadcnCard
      >
        <div ref={tiltTargetRef} style={tiltStyle}>
          {children} 
        </div>
      </ShadcnCard>
    </div>
  );
}
