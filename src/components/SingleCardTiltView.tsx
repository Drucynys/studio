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
};

export function SingleCardTiltView({
  isOpen,
  onClose,
  imageUrl,
  altText,
}: SingleCardTiltViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [motionPermission, setMotionPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return;
    const cardNode = cardRef.current;
    if (!cardNode) return;
    const rect = cardNode.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mx = x / rect.width;
    const my = y / rect.height;

    const rY = (mx - 0.5) * -20;
    const rX = (my - 0.5) * 20;

    cardNode.style.setProperty('--rx', `${rX}deg`);
    cardNode.style.setProperty('--ry', `${rY}deg`);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    const cardNode = cardRef.current;
    if (!cardNode) return;
    cardNode.style.setProperty('--rx', '0deg');
    cardNode.style.setProperty('--ry', '0deg');
  };
  
  const handleDeviceMotion = useCallback((event: DeviceOrientationEvent) => {
    const cardNode = cardRef.current;
    if (!cardNode || !event.beta || !event.gamma) return;
    
    let gamma = event.gamma;
    let beta = event.beta;

    const maxTilt = 25;
    gamma = Math.max(-maxTilt, Math.min(maxTilt, gamma));
    beta = Math.max(-maxTilt, Math.min(maxTilt, beta));

    const rY = (gamma / maxTilt) * 15;
    const rX = (beta / maxTilt) * -15;

    cardNode.style.setProperty('--rx', `${rX}deg`);
    cardNode.style.setProperty('--ry', `${rY}deg`);
  }, []);

  const requestMotionPermission = async () => {
    // @ts-ignore
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        // @ts-ignore
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState === 'granted') {
          setMotionPermission('granted');
          window.addEventListener('deviceorientation', handleDeviceMotion);
        } else {
          setMotionPermission('denied');
        }
      } catch (error) {
        console.error("Device motion permission request failed:", error);
        setMotionPermission('denied');
      }
    } else {
      setMotionPermission('granted');
      window.addEventListener('deviceorientation', handleDeviceMotion);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    
    // Cleanup motion listener when component closes
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener('deviceorientation', handleDeviceMotion);
    };
  }, [isOpen, onClose, handleDeviceMotion]);

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
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={onClose} 
        >
          <div
            ref={cardRef}
            className="card aspect-[2.5/3.5] h-[72vh] max-h-[680px] w-auto cursor-pointer"
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
