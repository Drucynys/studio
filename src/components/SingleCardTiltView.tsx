
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const MAX_ROTATION = 10;
const MIN_DIMENSION_FOR_TILT_EFFECT = 50;

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
  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [cardDimensions, setCardDimensions] = useState({ width: 1, height: 1 });

  useEffect(() => {
    if (!isOpen) {
      setCardDimensions({ width: 1, height: 1 });
      setIsHovering(false);
      setMousePosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

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
    if (!cardRef.current || !isOpen) {
      if (isHovering) setIsHovering(false);
      return;
    }
    const currentWidth = cardRef.current.offsetWidth;
    const currentHeight = cardRef.current.offsetHeight;

    if (currentWidth > MIN_DIMENSION_FOR_TILT_EFFECT && currentHeight > MIN_DIMENSION_FOR_TILT_EFFECT) {
      if (cardDimensions.width !== currentWidth || cardDimensions.height !== currentHeight) {
        setCardDimensions({ width: currentWidth, height: currentHeight });
      }
    } else {
      if (isHovering) setIsHovering(false);
      return;
    }
    if (!isHovering) setIsHovering(true);
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  let dynamicCardTransform = "scale(1.0)";
  if (
    isHovering &&
    cardRef.current &&
    cardDimensions.width > MIN_DIMENSION_FOR_TILT_EFFECT &&
    cardDimensions.height > MIN_DIMENSION_FOR_TILT_EFFECT
  ) {
    const centerX = cardDimensions.width / 2;
    const centerY = cardDimensions.height / 2;
    const mouseXFromCenter = mousePosition.x - centerX;
    const mouseYFromCenter = mousePosition.y - centerY;

    const rotateY = (mouseXFromCenter / centerX) * MAX_ROTATION;
    const rotateX = (mouseYFromCenter / centerY) * -MAX_ROTATION;
    dynamicCardTransform = `scale(1.05) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
  }

  const cardStyle: React.CSSProperties = {
    transform: dynamicCardTransform,
    transformStyle: "preserve-3d",
    transition: "transform 0.05s linear",
  };

  const tiltContainerStyle: React.CSSProperties = {
    perspective: "1500px",
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className="w-screen h-screen max-w-none max-h-none p-0 flex flex-col bg-transparent backdrop-blur-md border-none rounded-none sm:rounded-none items-center justify-center"
        onPointerDownOutside={onClose} 
        onInteractOutside={onClose} 
      >
        <div
          className="flex-grow flex items-center justify-center relative overflow-hidden h-full w-full"
          style={tiltContainerStyle}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={onClose} 
        >
          <div
            ref={cardRef}
            style={cardStyle}
            className="relative aspect-[2.5/3.5] h-[72vh] max-h-[680px] w-auto rounded-xl overflow-hidden shadow-2xl cursor-pointer"
            data-ai-hint="pokemon card front large interactive"
            onClick={(e) => e.stopPropagation()} 
          >
            <Image
              src={imageUrl}
              alt={altText}
              layout="fill"
              objectFit="contain"
              priority
              className="rounded-xl"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
