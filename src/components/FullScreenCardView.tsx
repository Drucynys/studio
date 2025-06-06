
"use client";

import type { PokemonCard } from "@/types";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FullScreenCardViewProps {
  isOpen: boolean;
  onClose: () => void;
  cards: PokemonCard[];
  currentIndex: number | null;
  onNavigate: (newIndex: number) => void;
}

export function FullScreenCardView({
  isOpen,
  onClose,
  cards,
  currentIndex,
  onNavigate,
}: FullScreenCardViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const currentCard = currentIndex !== null ? cards[currentIndex] : null;

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
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    // Adjust clientX and clientY for pointer position relative to the element
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -12; // Max rotation 12deg
    const rotateY = ((x - centerX) / centerX) * 12;  // Max rotation 12deg
    
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl w-[90vw] h-[90vh] p-0 flex flex-col bg-background/90 backdrop-blur-sm border-border">
        <DialogHeader className="p-4 border-b border-border/50 flex-row items-center justify-between">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {currentCard.name || `Card #${currentCard.cardNumber}`}
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="flex-grow flex items-center justify-center p-4 relative overflow-hidden">
          {/* Navigation Buttons */}
          {currentIndex !== null && currentIndex > 0 && (
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-background/70 hover:bg-background"
              onClick={() => onNavigate(currentIndex - 1)}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          <div 
            className="tilt-container" // For perspective
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div
              ref={cardRef}
              style={{
                transform: `perspective(1500px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(1)`,
                transition: 'transform 0.05s linear', // Faster transition for smoother mouse follow
              }}
              className="relative aspect-[2.5/3.5] w-auto h-[70vh] max-h-[500px] max-w-[calc(0.7*70vh)] rounded-lg shadow-2xl overflow-hidden"
            >
              <Image
                src={currentCard.imageUrl || "https://placehold.co/300x420.png"}
                alt={currentCard.name || "Pokémon Card"}
                layout="fill"
                objectFit="contain"
                priority
                data-ai-hint="pokemon card front large"
              />
            </div>
          </div>

          {currentIndex !== null && currentIndex < cards.length - 1 && (
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-background/70 hover:bg-background"
              onClick={() => onNavigate(currentIndex + 1)}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>
        
        <div className="p-4 border-t border-border/50 text-center">
          <p className="text-sm text-muted-foreground">
            {currentCard.set} - #{currentCard.cardNumber}
          </p>
          <div className="flex gap-2 justify-center mt-1">
            <Badge variant="secondary">{currentCard.rarity}</Badge>
            {displayVariant && <Badge variant="outline">{displayVariant}</Badge>}
            <Badge variant="outline">{currentCard.condition}</Badge>
             <Badge variant="outline">Qty: {currentCard.quantity}</Badge>
          </div>
           <p className="text-xs text-muted-foreground mt-2">
            Card {currentIndex !== null ? currentIndex + 1 : '-' } of {cards.length}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
