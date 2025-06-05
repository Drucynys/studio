
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
  cardImageUrl,
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
  // const [currentDefaultVariant, setCurrentDefaultVariant] = useState<string>(""); // Not strictly needed if we just set selectedVariant

  useEffect(() => {
    if (isOpen) {
      setSelectedCondition(""); // Always reset condition

      if (isFetchingCardDetails && sourceApi === 'tcgdex') {
        // We are actively fetching details for TCGdex flow
        setCurrentAvailableVariants([]);
        // setCurrentDefaultVariant("");
        setSelectedVariant("");
        // The loading spinner will be shown by the JSX based on isFetchingCardDetails
      } else {
        // Fetching is complete or not applicable (e.g. PokemonTCG.io flow, or TCGdex fetch finished)
        if (sourceApi === 'tcgdex' && tcgDexFullCard && tcgDexFullCard.prices) {
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
          
          // setCurrentDefaultVariant(determinedDefault);
          setSelectedVariant(determinedDefault);
        } else if (sourceApi === 'pokemontcg' && propsAvailableVariants) { 
          setCurrentAvailableVariants(propsAvailableVariants);
          const initialVariant = propsDefaultVariant || (propsAvailableVariants.length > 0 ? propsAvailableVariants[0] : "");
          // setCurrentDefaultVariant(initialVariant);
          setSelectedVariant(initialVariant);
        } else { 
          // No TCGdex card details with prices, and no propsAvailableVariants
          // (e.g. TCGdex card fetch failed, or card has no variants/prices, or non-variant PokemonTCG.io card)
          setCurrentAvailableVariants([]);
          // setCurrentDefaultVariant("");
          setSelectedVariant("");
        }
      }
    }
  }, [isOpen, sourceApi, propsAvailableVariants, propsDefaultVariant, tcgDexFullCard, isFetchingCardDetails]);

  const handleSubmit = () => {
    let variantToSave = "Normal"; 
    if (currentAvailableVariants.length > 0 && selectedVariant) {
      variantToSave = selectedVariant;
    }
    
    if (selectedCondition) { 
      onAddCard(selectedCondition, variantToSave); 
      // Resetting fields after successful add is good practice
      setSelectedCondition(""); 
      setSelectedVariant(""); 
      setCurrentAvailableVariants([]);
      onClose();
    }
  };
  
  const showVariantSelector = currentAvailableVariants.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add "{cardName}" to Collection</DialogTitle>
          <DialogDescription>
            Select the condition {showVariantSelector && "and variant "}of your card.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center mb-4">
            <div className="relative w-40 h-56 rounded-md overflow-hidden shadow-md" data-ai-hint="pokemon card front">
              {(isFetchingCardDetails && sourceApi === 'tcgdex') ? (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Image 
                  src={cardImageUrl} 
                  alt={cardName} 
                  layout="fill" 
                  objectFit="contain"
                  key={cardImageUrl} 
                />
              )}
            </div>
          </div>
          
          {isFetchingCardDetails && sourceApi === 'tcgdex' ? (
            <div className="flex items-center justify-center text-muted-foreground py-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading card details...
            </div>
          ) : (
            <>
              {/* Variant Selector Logic */}
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

              {/* No Variants Message */}
              {!showVariantSelector && (
                (sourceApi === 'tcgdex' && tcgDexFullCard !== undefined) || // TCGdex flow was attempted
                (sourceApi === 'pokemontcg' && propsAvailableVariants !== undefined && propsAvailableVariants.length === 0) // PokemonTCG.io flow was attempted but no variants
              ) && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  No specific variants with pricing found. Adding as "Normal".
                </p>
              )}
              
              {/* Condition Selector */}
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
