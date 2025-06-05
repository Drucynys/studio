
"use client";

import { useState, useEffect } from "react";
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
import type { TcgDexCard, TcgDexCardPriceInfo, TcgDexCardPrices } from "@/types/tcgdex";
import type { ApiPokemonCard as PokemonTcgApiCard } from "@/app/sets/[setId]/page"; // Assuming type is exported or defined here
import { Loader2, Tag, Gem } from "lucide-react";
import { getSafeTcgDexCardImageUrl } from "@/lib/tcgdexUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Helper to format variant keys for display
const formatVariantKey = (key: string): string => {
  if (key === "1stEditionNormal") return "1st Edition Normal";
  if (key === "1stEditionHolofoil") return "1st Edition Holo";
  if (key === "reverseHolofoil" || key === "reverseHolo") return "Reverse Holo";
  if (key === "holofoil") return "Holofoil";
  if (key === "normal") return "Normal";
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
};


type DisplayPriceInfo = {
  variantName: string;
  price: number | string; // string for "N/A"
  currencySymbol?: string;
};

type AddCardToCollectionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  initialCardImageUrl?: string | null;
  availableConditions: string[];
  sourceApi?: 'pokemontcg' | 'tcgdex';

  // API specific card data
  pokemonTcgApiCard?: PokemonTcgApiCard | null;
  tcgDexFullCard?: TcgDexCard | null;
  isFetchingCardDetails?: boolean;

  onAddCard: (condition: string, value: number) => void;
};

export function AddCardToCollectionDialog({
  isOpen,
  onClose,
  cardName,
  initialCardImageUrl,
  availableConditions,
  sourceApi,
  pokemonTcgApiCard,
  tcgDexFullCard,
  isFetchingCardDetails,
  onAddCard,
}: AddCardToCollectionDialogProps) {
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [finalDisplayImageUrl, setFinalDisplayImageUrl] = useState<string>("https://placehold.co/200x280.png");
  const [displayPrices, setDisplayPrices] = useState<DisplayPriceInfo[]>([]);
  const [cardRarity, setCardRarity] = useState<string | null>(null);

  // Effect for managing the display image URL
  useEffect(() => {
    if (!isOpen) return;

    let imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=Loading...";
    if (sourceApi === 'tcgdex') {
        if (isFetchingCardDetails) {
            const lowRes = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp');
            if (lowRes) imageUrlToSet = lowRes;
            else imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=Fetching...";
        } else if (tcgDexFullCard?.image) {
            const highRes = getSafeTcgDexCardImageUrl(tcgDexFullCard.image, 'high', 'webp');
            if (highRes) imageUrlToSet = highRes;
            else if (initialCardImageUrl) {
                 const lowResFallback = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp');
                 if (lowResFallback) imageUrlToSet = lowResFallback;
                 else imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image";
            } else {
                 imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image";
            }
        } else if (initialCardImageUrl) { // Fallback for TCGdex if full card not yet loaded but resume image exists
            const lowRes = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp');
            if (lowRes) imageUrlToSet = lowRes;
             else imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image+Available";
        } else { // Generic fallback
            imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image+Data";
        }
    } else if (sourceApi === 'pokemontcg' && pokemonTcgApiCard?.images.large) {
        imageUrlToSet = pokemonTcgApiCard.images.large;
    } else if (initialCardImageUrl) { // Generic initial for other sources
        imageUrlToSet = initialCardImageUrl;
    }
    setFinalDisplayImageUrl(imageUrlToSet);
  }, [isOpen, initialCardImageUrl, tcgDexFullCard, pokemonTcgApiCard, isFetchingCardDetails, sourceApi]);

  // Effect for processing prices and rarity
  useEffect(() => {
    if (!isOpen) {
      setSelectedCondition("");
      setDisplayPrices([]);
      setCardRarity(null);
      return;
    }
    // Reset when opening
    setSelectedCondition("");
    setDisplayPrices([]);
    setCardRarity(null);


    const newPrices: DisplayPriceInfo[] = [];
    let defaultPriceForCollection = 0;

    if (sourceApi === 'pokemontcg' && pokemonTcgApiCard?.tcgplayer?.prices) {
      setCardRarity(pokemonTcgApiCard.rarity || "N/A");
      const prices = pokemonTcgApiCard.tcgplayer.prices;
      for (const key in prices) {
        if (Object.prototype.hasOwnProperty.call(prices, key)) {
          const priceEntry = prices[key as keyof typeof prices];
          if (priceEntry && typeof priceEntry.market === 'number') {
            newPrices.push({ variantName: formatVariantKey(key), price: priceEntry.market, currencySymbol: '$' });
            if (key === 'normal' && priceEntry.market) defaultPriceForCollection = priceEntry.market;
            else if (key === 'holofoil' && priceEntry.market && defaultPriceForCollection === 0) defaultPriceForCollection = priceEntry.market;
          }
        }
      }
      if (newPrices.length > 0 && defaultPriceForCollection === 0) { // Fallback if no normal/holofoil
        const firstPriced = newPrices.find(p => typeof p.price === 'number' && p.price > 0);
        if (firstPriced && typeof firstPriced.price === 'number') defaultPriceForCollection = firstPriced.price;
      }
    } else if (sourceApi === 'tcgdex' && !isFetchingCardDetails && tcgDexFullCard?.prices) {
      setCardRarity(tcgDexFullCard.rarity || "N/A");
      const prices: TcgDexCardPrices = tcgDexFullCard.prices;
      const variantOrder = ["normal", "holofoil", "reverseHolo", "1stEditionNormal", "1stEditionHolofoil"];
      
      const sortedPriceKeys = Object.keys(prices).sort((a, b) => {
        const aIndex = variantOrder.indexOf(a);
        const bIndex = variantOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

      for (const key of sortedPriceKeys) {
          const priceEntry = prices[key as keyof TcgDexCardPrices] as TcgDexCardPriceInfo;
          if (typeof priceEntry === 'object' && priceEntry !== null && typeof priceEntry.market === 'number' && !isNaN(priceEntry.market)) {
            newPrices.push({ variantName: formatVariantKey(key), price: priceEntry.market, currencySymbol: '€' }); // Assuming TCGdex/Cardmarket is Euro
             if (key === 'normal' && priceEntry.market) defaultPriceForCollection = priceEntry.market;
             else if (key === 'holofoil' && priceEntry.market && defaultPriceForCollection === 0) defaultPriceForCollection = priceEntry.market;
             else if (key === 'reverseHolo' && priceEntry.market && defaultPriceForCollection === 0) defaultPriceForCollection = priceEntry.market;
          }
      }
       if (newPrices.length > 0 && defaultPriceForCollection === 0) {
        const firstPriced = newPrices.find(p => typeof p.price === 'number' && p.price > 0);
        if (firstPriced && typeof firstPriced.price === 'number') defaultPriceForCollection = firstPriced.price;
      }
    }
    setDisplayPrices(newPrices);
    // The actual `value` prop for onAddCard will be determined in handleSubmit now
  }, [isOpen, sourceApi, pokemonTcgApiCard, tcgDexFullCard, isFetchingCardDetails]);


  const handleSubmit = () => {
    if (selectedCondition) {
      let valueForCollection = 0;
      // Determine value based on displayed prices, preferring "Normal" or the first available
      const normalPriceEntry = displayPrices.find(p => p.variantName === "Normal" && typeof p.price === 'number');
      if (normalPriceEntry && typeof normalPriceEntry.price === 'number') {
        valueForCollection = normalPriceEntry.price;
      } else if (displayPrices.length > 0) {
        const firstAvailablePrice = displayPrices.find(p => typeof p.price === 'number' && p.price > 0);
        if (firstAvailablePrice && typeof firstAvailablePrice.price === 'number') {
            valueForCollection = firstAvailablePrice.price;
        }
      }
      onAddCard(selectedCondition, valueForCollection);
      onClose();
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setFinalDisplayImageUrl("https://placehold.co/200x280.png/CCCCCC/333333?text=Image+Error");
  };
  
  const isAddButtonDisabled = isFetchingCardDetails || !selectedCondition;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add "{cardName}" to Collection</DialogTitle>
          {cardRarity && <DialogDescription>Rarity: <Badge variant="secondary">{cardRarity}</Badge></DialogDescription>}
        </DialogHeader>

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
                unoptimized={sourceApi === 'tcgdex'} // TCGdex images might not need Next/Image optimization if direct URLs
              />
            </div>
          </div>

          {(isFetchingCardDetails && sourceApi === 'tcgdex') ? (
            <div className="flex items-center justify-center text-muted-foreground py-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading card details...
            </div>
          ) : (
            <>
              {displayPrices.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-1"><Tag className="h-4 w-4 text-primary"/> Market Prices:</h4>
                  <ScrollArea className="h-[100px] border rounded-md p-2 bg-muted/30">
                    <ul className="space-y-1 text-xs">
                      {displayPrices.map(p => (
                        <li key={p.variantName} className="flex justify-between items-center">
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
              {displayPrices.length === 0 && !isFetchingCardDetails && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  No specific market prices found for this card.
                </p>
              )}
              
              <Separator className="my-2"/>

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
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isAddButtonDisabled}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isFetchingCardDetails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add to Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
