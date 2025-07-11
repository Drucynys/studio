// src/components/FullScreenCardView.tsx
"use client";

import type { PokemonCard } from "@/types";
import Image from "next/image";
import { useEffect, useRef, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Languages, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ApiPokemonCard } from "@/app/sets/[setId]/page";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { MarketPriceHistoryChart } from "./MarketPriceHistoryChart";

const getMarketPrice = (apiCard: ApiPokemonCard | undefined | null, variant?: string | null): number => {
  if (!apiCard || !apiCard.tcgplayer?.prices) return 0;
  const prices = apiCard.tcgplayer.prices;
  
  if (variant && prices[variant]?.market) {
    return prices[variant]!.market!;
  }
  const variantPriority = ['normal', 'holofoil', 'reverseHolofoil', '1stEditionNormal', '1stEditionHolofoil', 'unlimitedHolofoil', 'unlimitedNormal'];
  for (const v of variantPriority) {
    if (prices[v]?.market) {
      return prices[v]!.market!;
    }
  }
  for (const key in prices) {
    if (Object.prototype.hasOwnProperty.call(prices, key) && prices[key]?.market) {
      return prices[key]!.market!;
    }
  }
  return 0;
};

const formatVariantKey = (key: string): string => {
  if (!key) return "N/A";
  return key
    .replace(/([A-Z0-9])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};


type FullScreenCardViewProps = {
  isOpen: boolean;
  onClose: () => void;
  cards: PokemonCard[];
  currentIndex: number | null;
  onNavigate: (newIndex: number) => void;
  masterCardData: Map<string, ApiPokemonCard>;
};


export function FullScreenCardView({
  isOpen,
  onClose,
  cards,
  currentIndex,
  onNavigate,
  masterCardData,
}: FullScreenCardViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const currentCard = currentIndex !== null ? cards[currentIndex] : null;
  const masterCard = currentCard ? masterCardData.get(currentCard.apiId) : null;

  const allAvailablePrices = useMemo(() => {
    const tcgPlayerPrices: { name: string; value: number; currency: string }[] = [];

    // TCGPlayer
    if (masterCard?.tcgplayer?.prices) {
      for (const [variant, priceData] of Object.entries(masterCard.tcgplayer.prices)) {
        if (priceData?.market) {
          const numericValue = parseFloat(priceData.market as any);
          if (!isNaN(numericValue) && numericValue > 0) {
            tcgPlayerPrices.push({
              name: formatVariantKey(variant),
              value: numericValue,
              currency: '$',
            });
          }
        }
      }
    }

    return { tcgPlayerPrices };
  }, [masterCard]);


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

  const displayVariant = formatVariantKey(currentCard?.variant ?? '');
  const currentMarketValue = getMarketPrice(masterCard, currentCard?.variant);
  const displayValue = currentMarketValue > 0 ? currentMarketValue : (currentCard?.value || 0);
  
  if (!currentCard) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 flex flex-col bg-transparent backdrop-blur-md border-none rounded-none sm:rounded-none">
        <DialogHeader className="p-2 flex-row items-center justify-end border-b border-border/20 absolute top-0 left-0 right-0 z-20 bg-transparent">
           <DialogTitle className="sr-only">
             Full Screen Card View: {currentCard.name || `Card #${currentCard.cardNumber}`}
          </DialogTitle>
        </DialogHeader>

        <div
            className="flex-grow flex items-center justify-center relative overflow-hidden pt-12 pb-28 h-full w-full card-container"
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
            className="card aspect-[2.5/3.5] h-[72vh] max-h-[680px] w-auto"
            data-ai-hint="pokemon card front large interactive"
          >
            <Image
              key={`${currentCard.id}-image`}
              src={currentCard.imageUrl || "https://placehold.co/500x700.png"}
              alt={currentCard.name || "Pokémon Card"}
              layout="fill"
              objectFit="cover"
              priority
              className="card-image"
            />
            <div className="shine" />
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
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">{currentCard.rarity}</Badge>
            {displayVariant && <Badge variant="outline" className="text-xs">{displayVariant}</Badge>}
            <Badge variant="outline" className="text-xs border-indigo-500/50 text-indigo-600 flex items-center gap-1">
                <Languages size={12}/> {currentCard.language}
            </Badge>
             <Badge variant="outline" className="text-xs">Qty: {currentCard.quantity}</Badge>
             {(displayValue > 0) && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-auto px-2 py-0.5 text-xs border-green-500/50 text-green-600 hover:bg-green-500/10 hover:text-green-700 flex items-center gap-1">
                            <DollarSign size={12}/> {displayValue.toFixed(2)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96" align="center">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Market Prices</h4>
                            <p className="text-sm text-muted-foreground">
                                Live prices from TCGPlayer.
                            </p>
                        </div>
                        <div className="mt-4 max-h-40 overflow-y-auto pr-2">
                            {allAvailablePrices.tcgPlayerPrices.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center">No price data available.</p>
                            ) : (
                                <div className="space-y-4">
                                    {allAvailablePrices.tcgPlayerPrices.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground mb-1">TCGPlayer</p>
                                            <div className="space-y-1">
                                                {allAvailablePrices.tcgPlayerPrices.map((price, index) => (
                                                    <div key={`tcg-${index}`} className="grid grid-cols-[1fr,auto] items-center gap-4 text-sm">
                                                        <span className="text-muted-foreground">{price.name}</span>
                                                        <span className="font-semibold text-right">{price.currency}{price.value.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <Separator className="my-4" />
                        <MarketPriceHistoryChart cardApiId={currentCard?.apiId ?? null} />
                    </PopoverContent>
                </Popover>
             )}
          </div>
           <p className="text-xs text-muted-foreground mt-2">
            Card {currentIndex !== null ? currentIndex + 1 : '-' } of {cards.length}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
