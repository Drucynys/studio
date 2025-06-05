
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
import type { TcgDexCard } from "@/types/tcgdex";
import { Loader2 } from "lucide-react";

const formatVariantKey = (key: string): string => {
  if (!key) return "N/A";
  // Specific handling for TCGdex keys like "firstEditionNormal" or "reverseHolo"
  if (key === "firstEditionNormal") return "1st Edition Normal";
  if (key === "firstEditionHolofoil") return "1st Edition Holofoil";
  if (key === "reverseHolo") return "Reverse Holo";
  
  return key
    .replace(/([A-Z0-9])/g, ' $1') 
    .replace(/^./, str => str.toUpperCase()) 
    .trim();
};

type AddCardToCollectionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  cardImageUrl: string;
  availableConditions: string[];
  
  // For PokemonTCG API flow
  availableVariants?: string[]; 
  defaultVariant?: string;

  // For TCGdex API flow
  tcgDexFullCard?: TcgDexCard | null;
  isFetchingCardDetails?: boolean;

  onAddCard: (condition: string, variant: string) => void;
};

export function AddCardToCollectionDialog({
  isOpen,
  onClose,
  cardName,
  cardImageUrl,
  availableConditions,
  availableVariants: propsAvailableVariants, // Renamed to avoid conflict
  defaultVariant: propsDefaultVariant,     // Renamed
  tcgDexFullCard,
  isFetchingCardDetails,
  onAddCard,
}: AddCardToCollectionDialogProps) {
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [currentAvailableVariants, setCurrentAvailableVariants] = useState<string[]>([]);
  const [currentDefaultVariant, setCurrentDefaultVariant] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setSelectedCondition(""); 

      if (tcgDexFullCard && tcgDexFullCard.prices) {
        const variantsFromTcgDex = Object.keys(tcgDexFullCard.prices).filter(
          // Filter out non-variant keys and ensure market price exists for active variants
          key => typeof tcgDexFullCard.prices![key] === 'object' && tcgDexFullCard.prices![key]?.market !== undefined && tcgDexFullCard.prices![key]?.market !== null
        ).sort();
        
        setCurrentAvailableVariants(variantsFromTcgDex);

        let determinedDefault = "";
        if (variantsFromTcgDex.includes("normal")) determinedDefault = "normal";
        else if (variantsFromTcgDex.includes("holofoil")) determinedDefault = "holofoil";
        else if (variantsFromTcgDex.length > 0) determinedDefault = variantsFromTcgDex[0];
        setCurrentDefaultVariant(determinedDefault);
        setSelectedVariant(determinedDefault);

      } else if (propsAvailableVariants) {
        setCurrentAvailableVariants(propsAvailableVariants);
        const initialVariant = propsDefaultVariant || (propsAvailableVariants.length > 0 ? propsAvailableVariants[0] : "");
        setCurrentDefaultVariant(initialVariant);
        setSelectedVariant(initialVariant);
      } else {
        // No variants from either source
        setCurrentAvailableVariants([]);
        setCurrentDefaultVariant("");
        setSelectedVariant("");
      }
    }
  }, [isOpen, propsAvailableVariants, propsDefaultVariant, tcgDexFullCard]);

  const handleSubmit = () => {
    if (selectedCondition && (selectedVariant || currentAvailableVariants.length === 0) ) {
      // If no variants available, selectedVariant might be empty string, which is fine.
      onAddCard(selectedCondition, selectedVariant || "Normal"); // Default to "Normal" if no variants shown/selected
      setSelectedCondition(""); 
      setSelectedVariant("");
      onClose();
    }
  };

  const showVariantSelector = currentAvailableVariants && currentAvailableVariants.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add "{cardName}" to Collection</DialogTitle>
          <DialogDescription>
            Select the condition {showVariantSelector && !isFetchingCardDetails && "and variant "}of your card.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center mb-4">
            <div className="relative w-40 h-56 rounded-md overflow-hidden shadow-md" data-ai-hint="pokemon card front">
              {isFetchingCardDetails ? (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Image src={cardImageUrl} alt={cardName} layout="fill" objectFit="contain" />
              )}
            </div>
          </div>
          
          {isFetchingCardDetails && (
            <div className="flex items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading card details...
            </div>
          )}

          {!isFetchingCardDetails && showVariantSelector && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="variant" className="text-right col-span-1">
                Variant
              </Label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant} disabled={isFetchingCardDetails}>
                <SelectTrigger id="variant" className="col-span-3">
                  <SelectValue placeholder="Select variant" />
                </SelectTrigger>
                <SelectContent>
                  {currentAvailableVariants.map((variant) => (
                    <SelectItem key={variant} value={variant}>
                      {formatVariantKey(variant)}
                       {tcgDexFullCard?.prices?.[variant]?.market !== undefined && 
                        ` ($${tcgDexFullCard.prices[variant]!.market?.toFixed(2)})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {!isFetchingCardDetails && !showVariantSelector && tcgDexFullCard && (
             <p className="text-xs text-center text-muted-foreground">No specific variants with pricing found for this card.</p>
          )}


          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="condition" className="text-right col-span-1">
              Condition
            </Label>
            <Select value={selectedCondition} onValueChange={setSelectedCondition} disabled={isFetchingCardDetails}>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={isFetchingCardDetails || !selectedCondition || (showVariantSelector && !selectedVariant)} 
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
