
"use client";

import type { PokemonCard } from "@/types";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Languages } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MAX_ROTATION = 10;
const MIN_DIMENSION_FOR_TILT_EFFECT = 50;

type FullScreenCardViewProps = {
  isOpen: boolean;
  onClose: () => void;
  cards: PokemonCard[];
  currentIndex: number | null;
  onNavigate: (newIndex: number) => void;
};

export function FullScreenCardView({
  isOpen,
  onClose,
  cards,
  currentIndex,
  onNavigate,
}: FullScreenCardViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [cardDimensions, setCardDimensions] = useState({ width: 1, height: 1 });

  const currentCard = currentIndex !== null ? cards[currentIndex] : null;

  useEffect(() => {
    if (!isOpen) {
      setCardDimensions({ width: 1, height: 1 });
      setIsHovering(false);
      setMousePosition({ x: 0, y: 0 });
    }
  }, [isOpen]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || currentIndex === null) return;
      if (event.key === "ArrowRight") {
        if (currentIndex < cards.length - 1) {
          onNavigate(currentIndex + 1);
        }
      } else if (event.key === "ArrowLeft") {
        if (currentIndex > 0) {
          onNavigate(currentIndex - 1);
        }
      } else if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, currentIndex, cards.length, onNavigate, onClose]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !isOpen) {
       if (isHovering) setIsHovering(false);
      return;
    }

    const currentWidth = cardRef.current.offsetWidth;
    const currentHeight = cardRef.current.offsetHeight;

    if (
      currentWidth > MIN_DIMENSION_FOR_TILT_EFFECT &&
      currentHeight > MIN_DIMENSION_FOR_TILT_EFFECT
    ) {
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

  const formatDisplayVariant = (variantKey?: string): string | null => {
    if (!variantKey) return null;
    return variantKey
      .replace(/([A-Z0-9])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  if (!currentCard) {
    return null;
  }

  const displayVariant = formatDisplayVariant(currentCard.variant);

  let dynamicCardTransform = "scale(1.0) translateY(-10px)";
  let shineBackground = "transparent";
  let shineOpacity = 0;

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

    dynamicCardTransform = `scale(1.05) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px) translateY(-10px)`;

    const shineXPercent = (mousePosition.x / cardDimensions.width) * 100;
    const shineYPercent = (mousePosition.y / cardDimensions.height) * 100;

    shineBackground = `radial-gradient(circle farthest-corner at ${shineXPercent}% ${shineYPercent}%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 60%)`;
    shineOpacity = 0.6;
  }

  const cardStyle: React.CSSProperties = {
    transform: dynamicCardTransform,
    transformStyle: "preserve-3d",
    transition: "transform 0.05s linear",
  };

  const shineStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: shineBackground,
    opacity: shineOpacity,
    mixBlendMode: "color-dodge",
    pointerEvents: "none",
    zIndex: 10,
    transition: "opacity 0.05s linear",
    borderRadius: 'inherit',
  };

  const tiltContainerStyle: React.CSSProperties = {
    perspective: "1500px",
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 flex flex-col bg-transparent backdrop-blur-md border-none rounded-none sm:rounded-none">
        <DialogHeader className="p-2 flex-row items-center justify-end border-b border-border/20 absolute top-0 left-0 right-0 z-20 bg-transparent">
           <DialogTitle className="sr-only">
             Full Screen Card View: {currentCard.name || `Card #${currentCard.cardNumber}`}
          </DialogTitle>
        </DialogHeader>

        <div
            className="flex-grow flex items-center justify-center relative overflow-hidden pt-12 pb-28 h-full w-full"
            style={tiltContainerStyle}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
          {currentIndex !== null && currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 md:left-4 top-1/2 -translate-y-1/2 z-30 bg-black/20 hover:bg-black/30 text-white rounded-full h-10 w-10 md:h-12 md:w-12"
              onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1);}}
              aria-label="Previous Card"
            >
              <ChevronLeft className="h-7 w-7 md:h-8 md:w-8" />
            </Button>
          )}

          <div
            ref={cardRef}
            key={currentCard.id}
            style={cardStyle}
            className="relative aspect-[2.5/3.5] h-[72vh] max-h-[680px] w-auto rounded-xl overflow-hidden shadow-2xl"
            data-ai-hint="pokemon card front large interactive"
          >
            <div 
              className="relative w-full h-full z-[1] rounded-xl overflow-hidden"
            >
              <Image
                key={`${currentCard.id}-image`}
                src={currentCard.imageUrl || "https://placehold.co/500x700.png"}
                alt={currentCard.name || "Pokémon Card"}
                layout="fill"
                objectFit="contain"
                priority
                className="rounded-xl"
              />
            </div>
            <div style={shineStyle} />
          </div>

          {currentIndex !== null && currentIndex < cards.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 md:right-4 top-1/2 -translate-y-1/2 z-30 bg-black/20 hover:bg-black/30 text-white rounded-full h-10 w-10 md:h-12 md:w-12"
              onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1);}}
              aria-label="Next Card"
            >
              <ChevronRight className="h-7 w-7 md:h-8 md:w-8" />
            </Button>
          )}
        </div>

        <div className="p-4 border-t border-border/20 text-center flex flex-col items-center absolute bottom-0 left-0 right-0 z-20 bg-background/50 backdrop-blur-sm">
           <p className="text-xl font-semibold text-foreground mb-1">
            {currentCard.name || `Card #${currentCard.cardNumber}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {currentCard.set} - #{currentCard.cardNumber}
          </p>
          <div className="flex gap-2 justify-center mt-2">
            <Badge variant="secondary" className="text-xs">{currentCard.rarity}</Badge>
            {displayVariant && <Badge variant="outline" className="text-xs">{displayVariant}</Badge>}
            <Badge variant="outline" className="text-xs">{currentCard.condition}</Badge>
            <Badge variant="outline" className="text-xs border-indigo-500/50 text-indigo-600 flex items-center gap-1">
                <Languages size={12}/> {currentCard.language}
            </Badge>
             <Badge variant="outline" className="text-xs">Qty: {currentCard.quantity}</Badge>
          </div>
           <p className="text-xs text-muted-foreground mt-2">
            Card {currentIndex !== null ? currentIndex + 1 : '-' } of {cards.length}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
