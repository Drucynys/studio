// src/components/SwipeBackIndicator.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function SwipeBackIndicator() {
  const router = useRouter();
  const pathname = usePathname();
  
  const [dragDistance, setDragDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isThresholdMet, setIsThresholdMet] = useState(false);

  useEffect(() => {
    // Disable swipe back gesture on the home index page
    if (pathname === "/") return;

    let touchStartX = 0;
    let touchStartY = 0;
    let activeDrag = false;

    const isDialogOpen = () => {
      return document.querySelector('[role="dialog"]') !== null;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isDialogOpen()) return;
      const startX = e.touches[0].clientX;
      const startY = e.touches[0].clientY;

      // Only initiate swipe back if starting from the left edge (x < 80px)
      if (startX < 80) {
        touchStartX = startX;
        touchStartY = startY;
        activeDrag = true;
        setIsDragging(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!activeDrag) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;

      const diffX = currentX - touchStartX;
      const diffY = Math.abs(currentY - touchStartY);

      // Guard: If vertical scrolling is prominent, cancel swipe gesture
      if (diffY > 40 && diffX < 50) {
        activeDrag = false;
        setIsDragging(false);
        setDragDistance(0);
        setIsThresholdMet(false);
        return;
      }

      if (diffX > 0) {
        // Prevent default browser viewport panning/sliding only during a valid horizontal drag
        if (e.cancelable) {
          e.preventDefault();
        }
        setDragDistance(diffX);
        setIsThresholdMet(diffX > 100 && diffY < 80);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!activeDrag) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const diffX = endX - touchStartX;
      const diffY = Math.abs(endY - touchStartY);

      // Trigger back navigation if:
      // 1. Swipe is left-to-right past the threshold (diffX > 100)
      // 2. Mostly horizontal (diffY < 80, highly responsive to natural thumb motion)
      if (diffX > 100 && diffY < 80) {
        // Fallback: If history length is short (direct entry or refresh), navigate to standard parent page
        if (window.history.length <= 2) {
          if (pathname.startsWith("/sets/")) {
            router.push("/browse-sets");
          } else if (pathname.startsWith("/pokedex/")) {
            router.push("/pokedex");
          } else if (pathname.startsWith("/browse-artists/")) {
            router.push("/browse-sets?tab=artists");
          } else {
            router.back();
          }
        } else {
          router.back();
        }
      }

      // Reset swipe states
      activeDrag = false;
      setIsDragging(false);
      setDragDistance(0);
      setIsThresholdMet(false);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pathname, router]);

  if (!isDragging || dragDistance < 10) return null;

  return (
    <div 
      className={cn(
        "fixed left-0 top-1/2 -translate-y-1/2 w-14 h-24 bg-card/75 backdrop-blur-md border border-l-0 border-border/80 rounded-r-full shadow-2xl flex items-center justify-center transition-all duration-100 ease-out z-50 pointer-events-none",
        isThresholdMet ? "border-green-500/50 bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]" : ""
      )}
      style={{
        transform: `translate3d(${Math.min(dragDistance - 56, 16)}px, -50%, 0) scale(${Math.min(0.7 + dragDistance / 300, 1.15)})`,
        opacity: Math.min(dragDistance / 70, 1),
      }}
    >
      <ChevronLeft 
        className={cn(
          "h-6 w-6 transition-all duration-300",
          isThresholdMet 
            ? "text-green-500 scale-125 animate-pulse" 
            : "text-muted-foreground scale-100"
        )} 
      />
    </div>
  );
}
