
"use client";

import type { PokemonCard } from "@/types";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogClose, DialogTitle } from "@/components/ui/dialog";
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10; // Max rotation 10deg
    const rotateY = ((x - centerX) / centerX) * 10;  // Max rotation 10deg
    
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
      <DialogContent className="max-w-4xl w-[90vw] h-[95vh] p-0 flex flex-col bg-transparent backdrop-blur-md border-border/30 rounded-lg">
        <DialogHeader className="p-2 flex-row items-center justify-between border-b border-border/20">
           {/* Accessible DialogTitle (visually hidden) */}
          <DialogTitle className="sr-only">
            Full Screen Card View: {currentCard.name || `Card #${currentCard.cardNumber}`}
          </DialogTitle>
          <div className="flex-grow"></div> {/* Spacer to push close button to the right */}
          <DialogClose asChild>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogHeader>

        {/* This div centers the card image and takes up available space */}
        <div className="flex-grow flex items-center justify-center relative overflow-hidden">
          {/* Navigation Buttons */}
          {currentIndex !== null && currentIndex > 0 && (
            <Button
              variant="ghost" 
              size="icon"
              className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-10 bg-black/10 hover:bg-black/20 text-white rounded-full h-10 w-10 md:h-12 md:w-12"
              onClick={() => onNavigate(currentIndex - 1)}
            >
              <ChevronLeft className="h-7 w-7 md:h-8 md:w-8" />
               <span className="sr-only">Previous Card</span>
            </Button>
          )}

          {/* Tilt Container - ensures the card within it is centered */}
          <div 
            className="tilt-container h-full w-full flex items-center justify-center" 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: "2000px" }} 
          >
            {/* Card Image Container - this is what gets tilted and scaled */}
            <div
              ref={cardRef}
              style={{
                transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(1.2)`, 
                transition: 'transform 0.05s linear', 
              }}
              className="relative aspect-[2.5/3.5] w-auto h-full rounded-xl shadow-2xl overflow-hidden"
              data-ai-hint="pokemon card front large interactive"
            >
              <Image
                key={currentCard.imageUrl} 
                src={currentCard.imageUrl || "https://placehold.co/500x700.png"}
                alt={currentCard.name || "Pokémon Card"}
                layout="fill"
                objectFit="contain"
                priority
              />
            </div>
          </div>

          {currentIndex !== null && currentIndex < cards.length - 1 && (
            <Button
              variant="ghost" 
              size="icon"
              className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-10 bg-black/10 hover:bg-black/20 text-white rounded-full h-10 w-10 md:h-12 md:w-12"
              onClick={() => onNavigate(currentIndex + 1)}
            >
              <ChevronRight className="h-7 w-7 md:h-8 md:w-8" />
              <span className="sr-only">Next Card</span>
            </Button>
          )}
        </div>
        
        <div className="p-4 border-t border-border/20 text-center flex flex-col items-center">
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
