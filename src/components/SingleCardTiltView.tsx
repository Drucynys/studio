
// src/components/SingleCardTiltView.tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "./ui/button";
import { Move3d } from "lucide-react";

type SingleCardTiltViewProps = {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText: string;
  rarity?: string;
};

export function SingleCardTiltView({
  isOpen,
  onClose,
  imageUrl,
  altText,
  rarity,
}: SingleCardTiltViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [motionPermission, setMotionPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  // Physics engine target/current state refs
  const targetRef = useRef({ rx: 0, ry: 0, posx: 50, posy: 50 });
  const currentRef = useRef({ rx: 0, ry: 0, posx: 50, posy: 50 });
  const animFrameId = useRef<number | null>(null);

  // Smooth Interpolation (Lerp) Loop running at 60fps / high refresh rates
  const runPhysicsLoop = useCallback(() => {
    const target = targetRef.current;
    const current = currentRef.current;
    
    // Buttery-smooth lerp interpolation: current = current + (target - current) * lerpFactor
    current.rx += (target.rx - current.rx) * 0.12;
    current.ry += (target.ry - current.ry) * 0.12;
    current.posx += (target.posx - current.posx) * 0.12;
    current.posy += (target.posy - current.posy) * 0.12;
    
    const cardNode = cardRef.current;
    if (cardNode) {
      cardNode.style.setProperty('--rx', `${current.rx.toFixed(2)}deg`);
      cardNode.style.setProperty('--ry', `${current.ry.toFixed(2)}deg`);
      cardNode.style.setProperty('--posx', `${current.posx.toFixed(2)}%`);
      cardNode.style.setProperty('--posy', `${current.posy.toFixed(2)}%`);
    }
    
    animFrameId.current = requestAnimationFrame(runPhysicsLoop);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return;
    const cardNode = cardRef.current;
    if (!cardNode) return;
    const rect = cardNode.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mx = x / rect.width;
    const my = y / rect.height;

    // Desktop tilts up to 20 degrees, maps cursor coordinate to shine position
    targetRef.current = {
      rx: (my - 0.5) * 20,
      ry: (mx - 0.5) * -20,
      posx: mx * 100,
      posy: my * 100
    };
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    // Reset smoothly back to absolute center
    targetRef.current = {
      rx: 0,
      ry: 0,
      posx: 50,
      posy: 50
    };
  };
  
  const handleDeviceMotion = useCallback((event: DeviceOrientationEvent) => {
    if (!event.beta || !event.gamma) return;
    
    const gamma = event.gamma; // [-90, 90] - left/right roll
    const beta = event.beta;   // [-180, 180] - front/back pitch

    // Target normal phone holding angle: Pitch = 55deg, Roll = 0deg
    const targetPitch = 55;
    const maxTilt = 30;

    // Calculate offsets from holding posture
    const offsetRoll = Math.max(-maxTilt, Math.min(maxTilt, gamma));
    const offsetPitch = Math.max(-maxTilt, Math.min(maxTilt, beta - targetPitch));

    // Convert angles to rotation degrees (tilt card up to 18 degrees)
    const rx = (offsetPitch / maxTilt) * -18;
    const ry = (offsetRoll / maxTilt) * 18;

    // Convert angles to dynamic reflection positions [10%, 90%] for realistic shimmer
    const posx = 50 + (offsetRoll / maxTilt) * 40;
    const posy = 50 + (offsetPitch / maxTilt) * 40;

    targetRef.current = { rx, ry, posx, posy };
  }, []);

  const requestMotionPermission = async () => {
    if (typeof window === 'undefined') return;

    const win = window as any;
    if ('DeviceOrientationEvent' in win) {
      const DeviceOrientation = win.DeviceOrientationEvent;
      if (typeof DeviceOrientation.requestPermission === 'function') {
        try {
          const permissionState = await DeviceOrientation.requestPermission();
          if (permissionState === 'granted') {
            setMotionPermission('granted');
            win.addEventListener('deviceorientation', handleDeviceMotion);
          } else {
            setMotionPermission('denied');
          }
        } catch (error) {
          console.error("Device motion permission request failed:", error);
          setMotionPermission('denied');
        }
      } else {
        setMotionPermission('granted');
        win.addEventListener('deviceorientation', handleDeviceMotion);
      }
    } else {
      setMotionPermission('granted');
      win.addEventListener('deviceorientation', handleDeviceMotion);
    }
  };

  useEffect(() => {
    // Start physics updating loop on mount
    animFrameId.current = requestAnimationFrame(runPhysicsLoop);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === "Escape") {
        onClose();
      }
    };
    
    const win = typeof window !== 'undefined' ? (window as any) : null;
    if (win) {
      win.addEventListener("keydown", handleKeyDown);
      
      // Auto-listen to device orientation if permission was already granted in active session
      if ('DeviceOrientationEvent' in win) {
        const DeviceOrientation = win.DeviceOrientationEvent;
        if (typeof DeviceOrientation.requestPermission !== 'function') {
          win.addEventListener('deviceorientation', handleDeviceMotion);
        }
      }
    }

    return () => {
      if (win) {
        win.removeEventListener("keydown", handleKeyDown);
        win.removeEventListener('deviceorientation', handleDeviceMotion);
      }
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isOpen, onClose, handleDeviceMotion, runPhysicsLoop]);

  const getRarityLevel = (rarityStr?: string): string => {
    if (!rarityStr) return "common";
    const clean = rarityStr.toLowerCase();
    
    // Secret / Special Illustration / Special rares
    if (
      clean.includes("secret") || 
      clean.includes("illustration rare") || 
      clean.includes("special") || 
      clean.includes("shiny ultra") ||
      clean.includes("hyper")
    ) {
      return "secret";
    }
    
    // Ultra Rare / Double Rare (ex, V, VMAX, etc.)
    if (
      clean.includes("ultra") || 
      clean.includes("double rare") || 
      clean.includes("vmax") || 
      clean.includes("vstar") ||
      clean.includes("ex")
    ) {
      return "ultra";
    }
    
    // Rare Holo / Rare / Holo / Shiny / Promo
    if (
      clean.includes("holo") || 
      clean.includes("rare") || 
      clean.includes("shiny") || 
      clean.includes("promo")
    ) {
      return "holo";
    }
    
    return "common";
  };

  const rarityLevel = getRarityLevel(rarity);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className="w-screen h-screen max-w-none max-h-none p-0 flex flex-col bg-transparent backdrop-blur-md border-none rounded-none sm:rounded-none items-center justify-center"
        onPointerDownOutside={onClose} 
        onInteractOutside={onClose}
      >
        <DialogHeader className="sr-only">
            <DialogTitle>Full Screen Card View: {altText}</DialogTitle>
        </DialogHeader>
        <div
          className="flex-grow flex items-center justify-center relative overflow-hidden h-full w-full card-container"
          onClick={onClose} 
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div
            ref={cardRef}
            className="card aspect-[2.5/3.5] h-[72vh] max-h-[680px] w-auto cursor-pointer"
            data-rarity={rarityLevel}
            data-ai-hint="pokemon card front large interactive"
            onClick={(e) => e.stopPropagation()} 
          >
            <Image
              src={imageUrl}
              alt={altText}
              layout="fill"
              objectFit="cover"
              priority
              className="card-image"
            />
            <div className="shine" />
          </div>
          {isMobile && motionPermission === 'prompt' && (
            <Button
              variant="secondary"
              className="absolute top-4 z-30"
              onClick={(e) => {
                e.stopPropagation();
                requestMotionPermission();
              }}
            >
              <Move3d className="mr-2 h-4 w-4" /> Enable Tilt Effect
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
