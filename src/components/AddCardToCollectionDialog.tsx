
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
  // Specific common keys for better formatting
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
  cardImageUrl: string; // This will be the initial low-res or placeholder
  availableConditions: string[];
  sourceApi?: 'pokemontcg' | 'tcgdex';
  
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
  cardImageUrl: initialCardImageUrl, // Renamed to avoid conflict with derived URL
  availableConditions,
  sourceApi,
  availableVariants: propsAvailableVariants,
  defaultVariant: propsDefaultVariant,
  tcgDexFullCard,
  isFetchingCardDetails,
  onAddCard,
}: AddCardToCollectionDialogProps) {
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [currentAvailableVariants, setCurrentAvailableVariants] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedCondition(""); // Always reset condition on open

      if (sourceApi === 'tcgdex') {
        if (isFetchingCardDetails) {
          // TCGdex: Actively fetching details
          setCurrentAvailableVariants([]);
          setSelectedVariant("");
          // JSX will show loading spinner based on isFetchingCardDetails
          return; 
        } else if (tcgDexFullCard && tcgDexFullCard.prices) {
          // TCGdex: Fetching complete, process variants
          const variantsFromTcgDex = Object.keys(tcgDexFullCard.prices).filter(
            key => typeof tcgDexFullCard.prices![key] === 'object' && 
                   tcgDexFullCard.prices![key]?.market !== undefined && 
                   tcgDexFullCard.prices![key]?.market !== null
          ).sort();
          
          setCurrentAvailableVariants(variantsFromTcgDex);

          let determinedDefault = "";
          if (variantsFromTcgDex.includes("normal")) determinedDefault = "normal";
          else if (variantsFromTcgDex.includes("holofoil")) determinedDefault = "holofoil";
          else if (variantsFromTcgDex.length > 0) determinedDefault = variantsFromTcgDex[0];
          setSelectedVariant(determinedDefault);
        } else {
          // TCGdex: Fetching complete, but no card details or no prices
          setCurrentAvailableVariants([]);
          setSelectedVariant("");
        }
      } else if (sourceApi === 'pokemontcg' && propsAvailableVariants) { 
        // PokemonTCG.io flow
        setCurrentAvailableVariants(propsAvailableVariants);
        const initialVariant = propsDefaultVariant || (propsAvailableVariants.length > 0 ? propsAvailableVariants[0] : "");
        setSelectedVariant(initialVariant);
      } else { 
        // Fallback or no variants applicable
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
      }
    }
  }, [isOpen, sourceApi, propsAvailableVariants, propsDefaultVariant, tcgDexFullCard, isFetchingCardDetails]);


  const handleSubmit = () => {
    let variantToSave = "Normal"; // Default if no variants are applicable/selected
    if (currentAvailableVariants.length > 0 && selectedVariant) {
      variantToSave = selectedVariant;
    } else if (sourceApi === 'pokemontcg' && propsAvailableVariants && propsAvailableVariants.length === 0) {
      // If pokemontcg flow and explicitly no variants passed, it's just normal.
      variantToSave = "Normal";
    }
    
    if (selectedCondition) { 
      onAddCard(selectedCondition, variantToSave); 
      onClose(); // Close after adding
    }
  };
  
  const showVariantSelector = currentAvailableVariants.length > 0;
  const displayCardImageUrl = (sourceApi === 'tcgdex' && tcgDexFullCard?.image) 
                              ? tcgDexFullCard.image // Use high-res from full details if available
                              : initialCardImageUrl; // Otherwise, use initial (low-res/placeholder)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add "{cardName}" to Collection</DialogTitle>
          <DialogDescription>
            Select the condition { (showVariantSelector && !(isFetchingCardDetails && sourceApi === 'tcgdex')) && "and variant "}of your card.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex justify-center mb-4">
            <div className="relative w-40 h-56 rounded-md overflow-hidden shadow-md" data-ai-hint="pokemon card front">
              <Image 
                src={displayCardImageUrl} 
                alt={cardName} 
                layout="fill" 
                objectFit="contain"
                key={displayCardImageUrl} 
              />
            </div>
          </div>
          
          {(isFetchingCardDetails && sourceApi === 'tcgdex') ? (
            <div className="flex items-center justify-center text-muted-foreground py-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading card details...
            </div>
          ) : (
            <>
              {showVariantSelector && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="variant-selector" className="text-right col-span-1">
                    Variant
                  </Label>
                  <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                    <SelectTrigger id="variant-selector" className="col-span-3">
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentAvailableVariants.map((variant) => (
                        <SelectItem key={variant} value={variant}>
                          {formatVariantKey(variant)}
                          {sourceApi === 'tcgdex' && tcgDexFullCard?.prices?.[variant]?.market !== undefined && 
                            ` ($${tcgDexFullCard.prices[variant]!.market?.toFixed(2)})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!showVariantSelector && !(isFetchingCardDetails && sourceApi === 'tcgdex') && (
                (sourceApi === 'tcgdex' && tcgDexFullCard !== null) || 
                (sourceApi === 'pokemontcg' && propsAvailableVariants && propsAvailableVariants.length === 0)
              ) && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  No specific variants with pricing found. Adding as "Normal".
                </p>
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
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={(isFetchingCardDetails && sourceApi === 'tcgdex') || !selectedCondition || (showVariantSelector && !selectedVariant)} 
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {(isFetchingCardDetails && sourceApi === 'tcgdex') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add to Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    