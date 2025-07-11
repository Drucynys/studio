// src/components/SingleCardTiltView.tsx
"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const cardNode = cardRef.current;
    if (!cardNode) return;
    const rect = cardNode.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mx = x / rect.width;
    const my = y / rect.height;

    const rY = (mx - 0.5) * -20;
    const rX = (my - 0.5) * 20;

    cardNode.style.setProperty('--mx', `${mx}`);
    cardNode.style.setProperty('--my', `${my}`);
    cardNode.style.setProperty('--posx', `${x}px`);
    cardNode.style.setProperty('--posy', `${y}px`);
    cardNode.style.setProperty('--rx', `${rX}deg`);
    cardNode.style.setProperty('--ry', `${rY}deg`);
  };

  const handleMouseLeave = () => {
    const cardNode = cardRef.current;
    if (!cardNode) return;
    cardNode.style.setProperty('--rx', '0deg');
    cardNode.style.setProperty('--ry', '0deg');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className="w-screen h-screen max-w-none max-h-none p-0 flex flex-col bg-transparent backdrop-blur-md border-none rounded-none sm:rounded-none items-center justify-center"
        onPointerDownOutside={onClose} 
        onInteractOutside={onClose} 
      >
        <DialogHeader className="sr-only"> {/* Added for accessibility */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
