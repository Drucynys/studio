
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
import type { ApiPokemonCard as PokemonTcgApiCard } from "@/app/sets/[setId]/page";
import { Loader2, Tag, Gem } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Helper to format variant keys for display
const formatVariantKey = (key: string): string => {
  if (key === "1stEditionNormal") return "1st Edition Normal";
  if (key === "1stEditionHolofoil") return "1st Edition Holo";
  if (key === "reverseHolofoil") return "Reverse Holo"; // PokemonTCG.io specific
  if (key === "holofoil") return "Holofoil";
  if (key === "normal") return "Normal";
  // Generic formatting for other keys from PokemonTCG.io (like 'unlimitedHolofoil', 'reverseHolo', etc.)
  return key
    .replace(/([A-Z0-9])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
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
  pokemonTcgApiCard: PokemonTcgApiCard | null; // Now non-optional if dialog is always for this
  onAddCard: (condition: string, value: number) => void;
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
  const [collectionValue, setCollectionValue] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCondition("");
      setDisplayPrices([]);
      setCardRarity(null);
      setFinalDisplayImageUrl("https://placehold.co/200x280.png");
      setCollectionValue(0);
      return;
    }

    let imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=Loading...";
    const newPrices: DisplayPriceInfo[] = [];
    let defaultPriceForCollection = 0;
    setCardRarity(null);

    if (pokemonTcgApiCard) {
      imageUrlToSet = pokemonTcgApiCard.images.large || initialCardImageUrl || "https://placehold.co/200x280.png";
      setCardRarity(pokemonTcgApiCard.rarity || "N/A");

      if (pokemonTcgApiCard.tcgplayer?.prices) {
        const prices = pokemonTcgApiCard.tcgplayer.prices;
        const sortedPriceKeys = Object.keys(prices).sort();

        for (const key of sortedPriceKeys) {
          if (Object.prototype.hasOwnProperty.call(prices, key)) {
            const priceEntry = prices[key as keyof typeof prices];
            if (priceEntry && typeof priceEntry.market === 'number' && !isNaN(priceEntry.market)) {
              newPrices.push({ variantName: formatVariantKey(key), price: priceEntry.market, currencySymbol: '$' });
              
              // Determine default value for collection (prefer normal, then holofoil, then first available)
              if (key === 'normal' && priceEntry.market > 0) {
                if(defaultPriceForCollection === 0 || key === 'normal') defaultPriceForCollection = priceEntry.market;
              } else if (key === 'holofoil' && priceEntry.market > 0 && (defaultPriceForCollection === 0 || prices['normal']?.market === undefined) ) {
                defaultPriceForCollection = priceEntry.market;
              } else if (key === 'reverseHolofoil' && priceEntry.market > 0 && (defaultPriceForCollection === 0 || (prices['normal']?.market === undefined && prices['holofoil']?.market === undefined))) {
                defaultPriceForCollection = priceEntry.market;
              }
            }
          }
        }
        // Fallback if no specific (normal, holofoil, reverseHolofoil) market price was found for collection value
        if (defaultPriceForCollection === 0 && newPrices.length > 0) {
            const firstPriced = newPrices.find(p => typeof p.price === 'number' && p.price > 0);
            if (firstPriced && typeof firstPriced.price === 'number') {
              defaultPriceForCollection = firstPriced.price;
            }
        }
      }
    } else if (initialCardImageUrl) {
      imageUrlToSet = initialCardImageUrl;
    }
    
    setFinalDisplayImageUrl(imageUrlToSet);
    setDisplayPrices(newPrices);
    setCollectionValue(defaultPriceForCollection);

  }, [isOpen, pokemonTcgApiCard, initialCardImageUrl, cardName]);

  const handleSubmit = () => {
    if (selectedCondition) {
      onAddCard(selectedCondition, collectionValue); // Pass the determined collectionValue
      onClose();
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setFinalDisplayImageUrl("https://placehold.co/200x280.png/CCCCCC/333333?text=Image+Error");
  };
  
  const isAddButtonDisabled = !selectedCondition;

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
              />
            </div>
          </div>
            <>
              {displayPrices.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-1"><Tag className="h-4 w-4 text-primary"/> Market Prices (PokemonTCG.io):</h4>
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
                   <p className="text-xs text-muted-foreground">
                    Selected card value for collection: ${collectionValue.toFixed(2)} (based on common print)
                  </p>
                </div>
              )}
              {displayPrices.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  No specific market prices found for this card. Adding with value $0.00.
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
        </div>
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
