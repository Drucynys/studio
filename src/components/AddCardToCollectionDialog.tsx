
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
  availableVariants: propsAvailableVariants,
  defaultVariant: propsDefaultVariant,
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

      // This block handles TCGdex flow when full card details are available
      if (tcgDexFullCard && tcgDexFullCard.prices && !isFetchingCardDetails) {
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
        
        setCurrentDefaultVariant(determinedDefault);
        setSelectedVariant(determinedDefault);
      } 
      // This block handles the PokemonTCG.io flow 
      else if (propsAvailableVariants && !tcgDexFullCard && !isFetchingCardDetails) { 
        setCurrentAvailableVariants(propsAvailableVariants);
        const initialVariant = propsDefaultVariant || (propsAvailableVariants.length > 0 ? propsAvailableVariants[0] : "");
        setCurrentDefaultVariant(initialVariant);
        setSelectedVariant(initialVariant);
      } 
      // This block is for when fetching is done (for TCGdex) or no TCGdex flow active, 
      // but no usable TCGDex variants or propsAvailableVariants were found
      else if (!isFetchingCardDetails) { 
        setCurrentAvailableVariants([]);
        setCurrentDefaultVariant("");
        setSelectedVariant("");
      }
      // If isFetchingCardDetails is true (for TCGdex flow), the states (currentAvailableVariants, etc.) are not changed here,
      // they will be updated when isFetchingCardDetails becomes false and tcgDexFullCard is populated.
    }
  }, [isOpen, propsAvailableVariants, propsDefaultVariant, tcgDexFullCard, isFetchingCardDetails]);

  const handleSubmit = () => {
    // Determine the variant to save.
    // If currentAvailableVariants has items (either from TCGdex or PokemonTCG.io via propsAvailableVariants), use selectedVariant.
    // If no variants were available from any source, default to "Normal".
    let variantToSave = "Normal"; // Default if no variants are applicable or selected.
    if (currentAvailableVariants.length > 0 && selectedVariant) {
      variantToSave = selectedVariant;
    } else if (propsAvailableVariants && propsAvailableVariants.length > 0 && selectedVariant) {
       variantToSave = selectedVariant;
    }


    if (selectedCondition) { // Simpler check: condition must be selected. Variant will be handled by variantToSave.
      onAddCard(selectedCondition, variantToSave); 
      setSelectedCondition(""); 
      setSelectedVariant(""); 
      onClose();
    }
  };
  
  // Determine if any variant selector should be shown
  const showAnyVariantSelector = !isFetchingCardDetails && (
    (tcgDexFullCard && currentAvailableVariants.length > 0) || 
    (propsAvailableVariants && propsAvailableVariants.length > 0 && !tcgDexFullCard)
  );


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add "{cardName}" to Collection</DialogTitle>
          <DialogDescription>
            Select the condition {showAnyVariantSelector && "and variant "}of your card.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center mb-4">
            <div className="relative w-40 h-56 rounded-md overflow-hidden shadow-md" data-ai-hint="pokemon card front">
              {(isFetchingCardDetails && (!tcgDexFullCard && !propsAvailableVariants)) ? (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Image 
                  src={cardImageUrl} 
                  alt={cardName} 
                  layout="fill" 
                  objectFit="contain"
                  key={cardImageUrl} // Ensures re-render if src changes
                />
              )}
            </div>
          </div>
          
          {isFetchingCardDetails && (
            <div className="flex items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading card details...
            </div>
          )}

          {/* Variant selector for TCGdex flow */}
          {!isFetchingCardDetails && tcgDexFullCard && currentAvailableVariants.length > 0 && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="variant-tcgdex" className="text-right col-span-1">
                Variant
              </Label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger id="variant-tcgdex" className="col-span-3">
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
          
          {/* Variant selector for PokemonTCG.io flow */}
          {!isFetchingCardDetails && propsAvailableVariants && propsAvailableVariants.length > 0 && !tcgDexFullCard && (
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="variant-pokemontcg" className="text-right col-span-1">
                Variant
              </Label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger id="variant-pokemontcg" className="col-span-3">
                  <SelectValue placeholder="Select variant" />
                </SelectTrigger>
                <SelectContent>
                  {propsAvailableVariants.map((variant) => (
                    <SelectItem key={variant} value={variant}>
                      {formatVariantKey(variant)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {!isFetchingCardDetails && !showAnyVariantSelector && (tcgDexFullCard || propsAvailableVariants) && (
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
            disabled={isFetchingCardDetails || !selectedCondition || (showAnyVariantSelector && !selectedVariant)} 
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
