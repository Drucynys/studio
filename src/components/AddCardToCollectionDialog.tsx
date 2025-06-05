
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ApiPokemonCard as PokemonTcgApiCard } from "@/app/sets/[setId]/page";
import { Tag, Gem, DollarSign } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MarketPriceHistoryChart } from "@/components/MarketPriceHistoryChart"; // Import the chart

// Helper to format variant keys for display
const formatVariantKey = (key: string): string => {
  return key
    .replace(/([A-Z0-9])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

type DisplayPriceInfo = {
  variantKey: string; // original key like "holofoil", "normal"
  variantName: string; // formatted name like "Holofoil"
  price: number | string;
  currencySymbol?: string;
};

type AddCardToCollectionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  initialCardImageUrl?: string | null;
  availableConditions: string[];
  pokemonTcgApiCard: PokemonTcgApiCard | null;
  onAddCard: (condition: string, value: number, variant?: string) => void; // Added variant
};

export function AddCardToCollectionDialog({
  isOpen,
  onClose,
  cardName,
  initialCardImageUrl,
  availableConditions,
  pokemonTcgApiCard,
  onAddCard,
}: AddCardToCollectionDialogProps) {
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [finalDisplayImageUrl, setFinalDisplayImageUrl] = useState<string>("https://placehold.co/200x280.png");
  const [displayPrices, setDisplayPrices] = useState<DisplayPriceInfo[]>([]);
  const [cardRarity, setCardRarity] = useState<string | null>(null);
  
  const [currentAvailableVariants, setCurrentAvailableVariants] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string>("");


  useEffect(() => {
    if (!isOpen) {
      setSelectedCondition("");
      setDisplayPrices([]);
      setCardRarity(null);
      setFinalDisplayImageUrl("https://placehold.co/200x280.png");
      setCurrentAvailableVariants([]);
      setSelectedVariant("");
      return;
    }

    let imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=Loading...";
    const newPrices: DisplayPriceInfo[] = [];
    const pricedVariants: string[] = [];
    setCardRarity(null);

    if (pokemonTcgApiCard?.tcgplayer?.prices) {
      imageUrlToSet = pokemonTcgApiCard.images.large || initialCardImageUrl || "https://placehold.co/200x280.png";
      setCardRarity(pokemonTcgApiCard.rarity || "N/A");
      
      const prices = pokemonTcgApiCard.tcgplayer.prices;
      const sortedPriceKeys = Object.keys(prices).sort((a,b) => {
        // Prioritize normal, holofoil, reverseHolofoil
        const order = ['normal', 'holofoil', 'reverseHolofoil'];
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b); // alphabetical for others
      });

      for (const key of sortedPriceKeys) {
        if (Object.prototype.hasOwnProperty.call(prices, key)) {
          const priceEntry = prices[key as keyof typeof prices];
          if (priceEntry && typeof priceEntry.market === 'number' && !isNaN(priceEntry.market)) {
            newPrices.push({ variantKey: key, variantName: formatVariantKey(key), price: priceEntry.market, currencySymbol: '$' });
            pricedVariants.push(key);
          }
        }
      }
      setCurrentAvailableVariants(pricedVariants);
      if (pricedVariants.length > 0) {
        // Set default variant: normal > holofoil > reverseHolofoil > first available
        let defaultVariant = pricedVariants.find(v => v === 'normal') || 
                             pricedVariants.find(v => v === 'holofoil') || 
                             pricedVariants.find(v => v === 'reverseHolofoil') || 
                             pricedVariants[0];
        setSelectedVariant(defaultVariant || "");
      } else {
        setSelectedVariant("");
      }

    } else if (initialCardImageUrl) {
      imageUrlToSet = initialCardImageUrl;
      setCurrentAvailableVariants([]);
      setSelectedVariant("");
    }
    
    setFinalDisplayImageUrl(imageUrlToSet);
    setDisplayPrices(newPrices);

  }, [isOpen, pokemonTcgApiCard, initialCardImageUrl]);

  const marketPriceForSelectedVariant = useMemo(() => {
    if (!selectedVariant || !pokemonTcgApiCard?.tcgplayer?.prices) return 0;
    const priceEntry = pokemonTcgApiCard.tcgplayer.prices[selectedVariant as keyof typeof pokemonTcgApiCard.tcgplayer.prices];
    return priceEntry?.market || 0;
  }, [selectedVariant, pokemonTcgApiCard]);

  const handleSubmit = () => {
    if (selectedCondition && (currentAvailableVariants.length === 0 || selectedVariant)) {
       onAddCard(selectedCondition, marketPriceForSelectedVariant, currentAvailableVariants.length > 0 ? selectedVariant : undefined);
      onClose();
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setFinalDisplayImageUrl("https://placehold.co/200x280.png/CCCCCC/333333?text=Image+Error");
  };
  
  const isAddButtonDisabled = !selectedCondition || (currentAvailableVariants.length > 0 && !selectedVariant);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg"> {/* Increased max width for chart */}
        <DialogHeader>
          <DialogTitle>Add "{cardName}" to Collection</DialogTitle>
          {cardRarity && <DialogDescription>Rarity: <Badge variant="secondary">{cardRarity}</Badge></DialogDescription>}
        </DialogHeader>

        <ScrollArea className="max-h-[80vh] pr-6">
          <div className="grid gap-4 py-4">
            <div className="flex justify-center mb-2">
              <div className="relative w-48 h-64 rounded-md overflow-hidden shadow-md" data-ai-hint="pokemon card front">
                <Image
                  src={finalDisplayImageUrl}
                  alt={cardName}
                  layout="fill"
                  objectFit="contain"
                  key={finalDisplayImageUrl}
                  onError={handleImageError}
                />
              </div>
            </div>
            
            {displayPrices.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-1"><Tag className="h-4 w-4 text-primary"/> Market Prices (PokemonTCG.io):</h4>
                <ScrollArea className="h-[100px] border rounded-md p-2 bg-muted/30">
                  <ul className="space-y-1 text-xs">
                    {displayPrices.map((p) => (
                      <li key={p.variantKey} className="flex justify-between items-center">
                        <span>{p.variantName}:</span>
                        <span className="font-medium">
                          {typeof p.price === 'number' ? `${p.currencySymbol || '$'}${p.price.toFixed(2)}` : p.price}
                        </span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
            
            <Separator className="my-2"/>

            {currentAvailableVariants.length > 0 && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="variant" className="text-right col-span-1">
                  Variant
                </Label>
                <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                  <SelectTrigger id="variant" className="col-span-3">
                    <SelectValue placeholder="Select variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentAvailableVariants.map((variantKey) => {
                      const priceInfo = displayPrices.find(p => p.variantKey === variantKey);
                      const priceDisplay = priceInfo && typeof priceInfo.price === 'number' ? `($${priceInfo.price.toFixed(2)})` : '';
                      return (
                        <SelectItem key={variantKey} value={variantKey}>
                          {formatVariantKey(variantKey)} {priceDisplay}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="condition" className="text-right col-span-1">
                Condition
              </Label>
              <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                <SelectTrigger id="condition" className="col-span-3">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {availableConditions.map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {condition}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVariant && marketPriceForSelectedVariant > 0 && (
                <p className="text-sm text-center text-foreground flex items-center justify-center gap-1">
                    <DollarSign className="h-4 w-4 text-green-500"/> Selected Value: <strong>${marketPriceForSelectedVariant.toFixed(2)}</strong>
                </p>
            )}
            {(currentAvailableVariants.length === 0 && displayPrices.length === 0) && (
                 <p className="text-xs text-center text-muted-foreground py-2">
                  No specific market prices found. Adding with value $0.00.
                </p>
            )}

            <Separator className="my-2"/>
            <MarketPriceHistoryChart />

          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isAddButtonDisabled}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Add to Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
