import type { PokemonCard } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Sparkles, ExternalLink, Palette, Edit3, Trash2, Layers, Eye, Languages, Paintbrush, Star, ArrowDown, ArrowRight, ArrowUp, DollarSign, Replace } from "lucide-react";
import React, { memo, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ApiPokemonCard } from "@/app/sets/[setId]/page";

type CardItemProps = {
  card: PokemonCard;
  cardIndex: number; // Index of the card in the list
  masterCard?: ApiPokemonCard;
  onEdit: () => void;
  onRemove: () => void;
  onView: (cardIndex: number) => void; // Handler for viewing the card
  onToggleFavorite: () => void;
  onAddToExchange: () => void;
};

const formatDisplayVariant = (variantKey?: string): string | null => {
  if (!variantKey) return null;
  return variantKey
    .replace(/([A-Z0-9])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const getMarketPrice = (apiCard: ApiPokemonCard | undefined, variant?: string | null): number => {
  if (!apiCard || !apiCard.tcgplayer?.prices) return 0;
  const prices = apiCard.tcgplayer.prices;
  
  if (variant && prices[variant]?.market) {
    return prices[variant].market;
  }
  const variantPriority = ['normal', 'holofoil', 'reverseHolofoil', '1stEditionNormal', '1stEditionHolofoil', 'unlimitedHolofoil', 'unlimitedNormal'];
  for (const v of variantPriority) {
    if (prices[v]?.market) {
      return prices[v].market;
    }
  }
  for (const key in prices) {
    if (Object.prototype.hasOwnProperty.call(prices, key) && prices[key]?.market) {
      return prices[key].market;
    }
  }
  return 0;
};


export const CardItem = memo(({ card, cardIndex, masterCard, onEdit, onRemove, onView, onToggleFavorite, onAddToExchange }: CardItemProps) => {
  if (!card) return null;

  const [isImageLoading, setIsImageLoading] = useState(true);

  // Memoize expensive calculations
  const tcgPlayerSearchUrl = useMemo(() => 
    `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeURIComponent(card.name || '')}${card.variant ? '&ProductTypeName=' + encodeURIComponent(card.variant || '') : ''}&view=grid`,
    [card.name, card.variant]
  );

  const displayVariant = useMemo(() => 
    formatDisplayVariant(card.variant as string | undefined),
    [card.variant]
  );

  const marketPriceData = useMemo(() => {
    const valueAdded = card.value || 0;
    const cardQuantity = card.quantity || 1;
    const currentValue = getMarketPrice(masterCard, card.variant);
    const valueDifference = currentValue > 0 ? currentValue - valueAdded : 0;
    
    return {
      valueAdded,
      cardQuantity,
      currentValue,
      valueDifference
    };
  }, [card.value, card.quantity, masterCard, card.variant]);

  const isHolo = useMemo(() => {
    const rarity = (card.rarity || "").toLowerCase();
    const variant = (card.variant || "").toLowerCase();
    return (
      rarity.includes("holo") ||
      rarity.includes("rare") ||
      rarity.includes("secret") ||
      rarity.includes("promo") ||
      rarity.includes("shiny") ||
      rarity.includes("ultra") ||
      variant.includes("holo") ||
      variant.includes("shiny")
    );
  }, [card.rarity, card.variant]);

  return (
    <Card className={cn(
      "relative shadow-lg hover:shadow-primary/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:-translate-y-1 hover:z-10 flex flex-col bg-card"
    )}>
      <CardHeader className="pb-3 relative">
        <Button variant="ghost" size="icon" onClick={onToggleFavorite} className={cn("absolute top-2 right-2 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-amber-500 z-10", card.isFavorite && "text-amber-500")}>
          <Star className={cn("h-5 w-5", card.isFavorite && "fill-current")} />
          <span className="sr-only">Favorite</span>
        </Button>
        <CardTitle className="font-headline text-lg leading-tight pr-8">
          {card.name || `${card.set} #${card.cardNumber}`}
        </CardTitle>
        {card.name && <CardDescription className="text-xs">{card.set} #{card.cardNumber}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2 flex-grow pb-3">
        <button
          type="button"
          aria-label={`View full card details for ${card.name || card.cardNumber}`}
          className={cn(
            "relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden mb-2 shadow-inner text-left border-0 p-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group",
            isImageLoading && "animate-shimmer bg-muted/40",
            isHolo && "list-card-holo"
          )}
          onClick={() => onView(cardIndex)}
        >
          <Image
            src={card.imageUrl || "https://placehold.co/250x350.png"}
            alt={card.name || card.cardNumber}
            width={250}
            height={350}
            className={cn(
              "object-contain w-full h-full transition-all duration-300",
              isImageLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
            )}
            onLoad={() => setIsImageLoading(false)}
            data-ai-hint="pokemon card front"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <Eye className="h-8 w-8 text-white" />
          </div>
        </button>
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <strong>Rarity:</strong> <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{card.rarity}</Badge>
        </div>
        {displayVariant && (
          <div className="flex items-center gap-2 text-xs">
            <Palette className="h-3.5 w-3.5 text-blue-500" />
            <strong>Variant:</strong> <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-blue-500/50 text-blue-600">{displayVariant}</Badge>
          </div>
        )}
         <div className="flex items-center gap-2 text-xs">
          <Languages className="h-3.5 w-3.5 text-indigo-500" />
          <strong>Language:</strong> <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-indigo-500/50 text-indigo-600">{card.language}</Badge>
        </div>
         <div className="flex items-center gap-2 text-xs">
          <Layers className="h-3.5 w-3.5 text-purple-500" />
          <strong>Quantity:</strong> <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-purple-500/50 text-purple-600">{marketPriceData.cardQuantity}</Badge>
        </div>
        {card.artist && (
          <div className="flex items-center gap-2 text-xs">
            <Paintbrush className="h-3.5 w-3.5 text-cyan-500" />
            <strong>Artist:</strong>
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-cyan-500/50 text-cyan-600 truncate">{card.artist}</Badge>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start space-y-2 pt-3">
         <div className="w-full space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1"><DollarSign size={14}/>Added</span>
                <span className="font-mono">${marketPriceData.valueAdded.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-primary flex items-center gap-1"><DollarSign size={14}/>Current</span>
                <div className="flex items-center gap-1">
                    <span className="font-mono">${marketPriceData.currentValue > 0 ? marketPriceData.currentValue.toFixed(2) : marketPriceData.valueAdded.toFixed(2)}</span>
                    {marketPriceData.currentValue > 0 && marketPriceData.valueDifference !== 0 && (
                        <span className={cn(
                            "flex items-center text-xs font-semibold",
                            marketPriceData.valueDifference > 0 && "text-emerald-600 dark:text-emerald-400",
                            marketPriceData.valueDifference < 0 && "text-rose-600 dark:text-rose-400"
                        )}>
                           {marketPriceData.valueDifference > 0 ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
                           <span className="font-mono">${Math.abs(marketPriceData.valueDifference).toFixed(2)}</span>
                        </span>
                    )}
                </div>
            </div>
        </div>

        {card.name && card.language === 'English' && (
           <a
            href={tcgPlayerSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 min-h-[44px] py-2 w-full"
          >
            View on TCGPlayer <ExternalLink size={12} />
          </a>
        )}
        {card.language === 'Japanese' && (
            <p className="text-xs text-muted-foreground italic min-h-[44px] py-2 w-full flex items-center">(TCGPlayer link N/A for Japanese cards)</p>
        )}
        
        <div className="flex gap-2 w-full pt-2">
          <Button variant="outline" onClick={onEdit} className="flex-1 h-11">
            <Edit3 className="mr-1.5 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" onClick={onRemove} className="flex-1 h-11">
            <Trash2 className="mr-1.5 h-4 w-4" /> Remove
          </Button>
        </div>
         <Button variant="secondary" onClick={onAddToExchange} className="w-full h-11">
            <Replace className="mr-1.5 h-4 w-4" /> Add to Exchange
          </Button>
      </CardFooter>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.isFavorite === nextProps.card.isFavorite &&
    prevProps.card.value === nextProps.card.value &&
    prevProps.card.quantity === nextProps.card.quantity &&
    prevProps.masterCard?.tcgplayer?.prices === nextProps.masterCard?.tcgplayer?.prices
  );
});
