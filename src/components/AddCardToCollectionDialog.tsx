
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
import type { ApiPokemonCard as PokemonTcgApiCard } from "@/app/sets/[setId]/page";
import { Loader2, Tag, Gem } from "lucide-react"; // Gem for rarity
import { getSafeTcgDexCardImageUrl } from "@/lib/tcgdexUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge"; // Added missing Badge import

// Helper to format variant keys for display
const formatVariantKey = (key: string): string => {
  if (key === "1stEditionNormal") return "1st Edition Normal";
  if (key === "1stEditionHolofoil") return "1st Edition Holo";
  if (key === "reverseHolofoil" || key === "reverseHolo") return "Reverse Holo";
  if (key === "holofoil") return "Holofoil";
  if (key === "normal") return "Normal";
  // Generic formatting for other keys
  return key.replace(/([A-Z0-9])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
};

type DisplayPriceInfo = {
  variantName: string;
  price: number | string;
  currencySymbol?: string;
};

type AddCardToCollectionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  initialCardImageUrl?: string | null;
  availableConditions: string[];
  sourceApi?: 'pokemontcg' | 'tcgdex';
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
  const [collectionValue, setCollectionValue] = useState<number>(0); // Value to be stored for the collection

  useEffect(() => {
    if (!isOpen) {
      // Reset states when dialog is closed
      setSelectedCondition("");
      setDisplayPrices([]);
      setCardRarity(null);
      setFinalDisplayImageUrl("https://placehold.co/200x280.png");
      setCollectionValue(0);
      return;
    }

    // Image URL Logic
    let imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=Loading...";
    if (sourceApi === 'tcgdex') {
      if (isFetchingCardDetails) {
        const lowRes = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp');
        imageUrlToSet = lowRes || "https://placehold.co/200x280.png/CCCCCC/333333?text=Fetching...";
      } else if (tcgDexFullCard?.image) {
        const highRes = getSafeTcgDexCardImageUrl(tcgDexFullCard.image, 'high', 'webp');
        imageUrlToSet = highRes || getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp') || "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image";
      } else if (initialCardImageUrl) {
        imageUrlToSet = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp') || "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image+Available";
      } else {
        imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image+Data";
      }
    } else if (sourceApi === 'pokemontcg' && pokemonTcgApiCard?.images.large) {
      imageUrlToSet = pokemonTcgApiCard.images.large;
    } else if (initialCardImageUrl) {
      imageUrlToSet = initialCardImageUrl;
    }
    setFinalDisplayImageUrl(imageUrlToSet);

    // Price & Rarity Processing Logic
    const newPrices: DisplayPriceInfo[] = [];
    let defaultPriceForCollection = 0;
    setCardRarity(null); // Reset rarity

    if (sourceApi === 'pokemontcg' && pokemonTcgApiCard?.tcgplayer?.prices) {
      setCardRarity(pokemonTcgApiCard.rarity || "N/A");
      const prices = pokemonTcgApiCard.tcgplayer.prices;
      for (const key in prices) {
        if (Object.prototype.hasOwnProperty.call(prices, key)) {
          const priceEntry = prices[key as keyof typeof prices];
          if (priceEntry && typeof priceEntry.market === 'number' && !isNaN(priceEntry.market)) {
            newPrices.push({ variantName: formatVariantKey(key), price: priceEntry.market, currencySymbol: '$' });
            if (key === 'normal' && priceEntry.market) defaultPriceForCollection = priceEntry.market;
            else if (key === 'holofoil' && priceEntry.market && defaultPriceForCollection === 0) defaultPriceForCollection = priceEntry.market;
          }
        }
      }
      if (newPrices.length > 0 && defaultPriceForCollection === 0) {
        const firstPriced = newPrices.find(p => typeof p.price === 'number' && p.price > 0);
        if (firstPriced && typeof firstPriced.price === 'number') defaultPriceForCollection = firstPriced.price;
      }
    } else if (sourceApi === 'tcgdex' && !isFetchingCardDetails && tcgDexFullCard && typeof tcgDexFullCard.prices === 'object' && tcgDexFullCard.prices !== null) {
      setCardRarity(tcgDexFullCard.rarity || "N/A");
      const prices = tcgDexFullCard.prices;
      
      for (const key in prices) {
        if (Object.prototype.hasOwnProperty.call(prices, key)) {
          // Skip known aggregate keys that don't represent specific card variants with market prices
          if (['average', 'low', 'trend', 'avg1', 'avg7', 'avg30', 'reverseHoloAvg1', 'reverseHoloAvg7', 'reverseHoloAvg30'].includes(key)) {
            continue;
          }
          
          const priceEntry = prices[key as keyof TcgDexCardPrices];
          if (priceEntry && typeof priceEntry === 'object' && typeof priceEntry.market === 'number' && !isNaN(priceEntry.market)) {
            newPrices.push({
              variantName: formatVariantKey(key),
              price: priceEntry.market,
              currencySymbol: '€',
            });

            // Determine default value for collection (simplified: prefer normal, then holofoil, then reverseHolo, then first available)
            if (key === 'normal' && priceEntry.market > 0) {
                if(defaultPriceForCollection === 0 || key === 'normal') defaultPriceForCollection = priceEntry.market;
            } else if (key === 'holofoil' && priceEntry.market > 0 && (defaultPriceForCollection === 0 || prices['normal']?.market === undefined) ) {
                defaultPriceForCollection = priceEntry.market;
            } else if ((key === 'reverseHolo' || key === 'reverseHolofoil') && priceEntry.market > 0 && (defaultPriceForCollection === 0 || (prices['normal']?.market === undefined && prices['holofoil']?.market === undefined))) {
                defaultPriceForCollection = priceEntry.market;
            }
          }
        }
      }
       // Fallback if no specific (normal, holo, reverseHolo) market price was found for collection value
      if (defaultPriceForCollection === 0 && newPrices.length > 0) {
        const firstPriced = newPrices.find(p => typeof p.price === 'number' && p.price > 0);
        if (firstPriced && typeof firstPriced.price === 'number') {
          defaultPriceForCollection = firstPriced.price;
        }
      }
    }
    
    setDisplayPrices(newPrices);
    setCollectionValue(defaultPriceForCollection);

  }, [isOpen, sourceApi, pokemonTcgApiCard, tcgDexFullCard, isFetchingCardDetails, initialCardImageUrl, cardName]);

  const handleSubmit = () => {
    if (selectedCondition) {
      onAddCard(selectedCondition, collectionValue);
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
                unoptimized={sourceApi === 'tcgdex'}
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
                      {displayPrices.map((p, index) => (
                        <li key={`${p.variantName}-${index}`} className="flex justify-between items-center">
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
