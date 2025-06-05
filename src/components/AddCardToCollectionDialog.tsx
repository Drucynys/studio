
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
import { getSafeTcgDexCardImageUrl } from "@/lib/tcgdexUtils"; // Import the helper

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
  initialCardImageUrl?: string | null; // Image from the grid (can be low-res or just path segment for TCGdex)
  availableConditions: string[];
  sourceApi?: 'pokemontcg' | 'tcgdex';
  
  availableVariants?: string[]; 
  defaultVariant?: string;

  tcgDexFullCard?: TcgDexCard | null;
  isFetchingCardDetails?: boolean;

  onAddCard: (condition: string, variant: string) => void;
};

export function AddCardToCollectionDialog({
  isOpen,
  onClose,
  cardName,
  initialCardImageUrl,
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
  const [finalDisplayImageUrl, setFinalDisplayImageUrl] = useState<string>("https://placehold.co/200x280.png");

  useEffect(() => {
    let imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=Loading...";

    if (sourceApi === 'tcgdex') {
        if (isFetchingCardDetails) {
            const lowRes = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp');
            if (lowRes) imageUrlToSet = lowRes;
            else imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=Fetching...";
        } else if (tcgDexFullCard?.image) {
            const highRes = getSafeTcgDexCardImageUrl(tcgDexFullCard.image, 'high', 'webp');
            if (highRes) imageUrlToSet = highRes;
            else if (initialCardImageUrl) { // Fallback if high-res path is bad but low-res was good
                 const lowResFallback = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp');
                 if (lowResFallback) imageUrlToSet = lowResFallback;
            }
        } else if (initialCardImageUrl) {
            const lowRes = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp');
            if (lowRes) imageUrlToSet = lowRes;
        }
    } else if (initialCardImageUrl) { 
        imageUrlToSet = initialCardImageUrl;
    }
    setFinalDisplayImageUrl(imageUrlToSet);

  }, [initialCardImageUrl, tcgDexFullCard, isFetchingCardDetails, sourceApi]);


  useEffect(() => {
    if (!isOpen) {
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
        setSelectedCondition("");
        return;
    }

    setSelectedCondition(""); 

    if (sourceApi === 'tcgdex') {
        if (isFetchingCardDetails) {
            setCurrentAvailableVariants([]);
            setSelectedVariant("");
            return; 
        }
        
        if (tcgDexFullCard && tcgDexFullCard.prices) {
            const variantsFromTcgDex = Object.keys(tcgDexFullCard.prices).filter(
                key => typeof tcgDexFullCard.prices![key] === 'object' && 
                       tcgDexFullCard.prices![key]?.market !== undefined && 
                       tcgDexFullCard.prices![key]?.market !== null
            ).sort();
            
            setCurrentAvailableVariants(variantsFromTcgDex);

            let determinedDefault = "";
            if (variantsFromTcgDex.length > 0) {
              if (variantsFromTcgDex.includes("normal")) determinedDefault = "normal";
              else if (variantsFromTcgDex.includes("holofoil")) determinedDefault = "holofoil";
              else determinedDefault = variantsFromTcgDex[0];
            }
            setSelectedVariant(determinedDefault);

        } else {
            setCurrentAvailableVariants([]);
            setSelectedVariant("");
        }
    } else if (sourceApi === 'pokemontcg' && propsAvailableVariants) { 
        setCurrentAvailableVariants(propsAvailableVariants);
        const initialVariant = propsDefaultVariant || (propsAvailableVariants.length > 0 ? propsAvailableVariants[0] : "");
        setSelectedVariant(initialVariant);
    } else { 
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
    }
  }, [isOpen, sourceApi, propsAvailableVariants, propsDefaultVariant, tcgDexFullCard, isFetchingCardDetails]);


  const handleSubmit = () => {
    let variantToSave = "Normal"; 
    if (currentAvailableVariants.length > 0 && selectedVariant) {
      variantToSave = selectedVariant;
    } else if ( (sourceApi === 'pokemontcg' && propsAvailableVariants && propsAvailableVariants.length === 0) || 
                (sourceApi === 'tcgdex' && currentAvailableVariants.length === 0) ) {
      variantToSave = "Normal"; // Default if no priced variants found or not applicable
    }
    
    if (selectedCondition) { 
      onAddCard(selectedCondition, variantToSave); 
      onClose(); 
    }
  };
  
  const showVariantSelector = currentAvailableVariants.length > 0;
  const noPricedVariantsFoundForTcgDex = sourceApi === 'tcgdex' && !isFetchingCardDetails && tcgDexFullCard !== null && currentAvailableVariants.length === 0;
  const noVariantsForPokemonTcg = sourceApi === 'pokemontcg' && propsAvailableVariants && propsAvailableVariants.length === 0;
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setFinalDisplayImageUrl("https://placehold.co/200x280.png/CCCCCC/333333?text=Image+Error");
  };

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
                src={finalDisplayImageUrl} 
                alt={cardName} 
                layout="fill" 
                objectFit="contain"
                key={finalDisplayImageUrl} 
                onError={handleImageError}
                unoptimized={sourceApi === 'tcgdex'} // TCGdex images might not need Next.js optimization if direct
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

              {(noPricedVariantsFoundForTcgDex || noVariantsForPokemonTcg) && (
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
