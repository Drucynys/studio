
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
import type { TcgDexCard, TcgDexCardPrices } from "@/types/tcgdex"; // Added TcgDexCardPrices
import { Loader2 } from "lucide-react";
import { getSafeTcgDexCardImageUrl } from "@/lib/tcgdexUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";


const formatVariantKey = (key: string): string => {
  if (!key) return "N/A";
  if (key === "firstEditionNormal") return "1st Edition Normal";
  if (key === "firstEditionHolofoil") return "1st Edition Holofoil";
  if (key === "reverseHolo" || key === "reverseHolofoil" || key === "reverse") return "Reverse Holo";
  
  return key
    .replace(/([A-Z0-9])/g, ' $1') 
    .replace(/^./, str => str.toUpperCase()) 
    .trim();
};

// Helper to get market price for a specific variant from TCGdex data
const getTcgDexPriceForVariant = (card: TcgDexCard | undefined | null, variantKey: string): number => {
  if (!card?.prices) return 0;
  const priceVariant = card.prices[variantKey];
  if (priceVariant && typeof priceVariant.market === 'number') {
    return priceVariant.market;
  }
  return 0; 
};


type AddCardToCollectionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  initialCardImageUrl?: string | null;
  availableConditions: string[];
  sourceApi?: 'pokemontcg' | 'tcgdex';
  
  // For PokemonTCG.io API
  availableVariants?: string[]; 
  defaultVariant?: string;

  // For TCGdex API
  tcgDexFullCard?: TcgDexCard | null;
  isFetchingCardDetails?: boolean;

  onAddCard: (condition: string, variant: string) => void;
};

const chartConfig = {
  price: {
    label: "Price ($)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

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
  const [chartData, setChartData] = useState<{ name: string; price: number }[]>([]);

  // Effect for managing the display image URL
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
            else if (initialCardImageUrl) { // Fallback to initial if high-res path exists but is invalid
                 const lowResFallback = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp');
                 if (lowResFallback) imageUrlToSet = lowResFallback;
                 else imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image";
            } else {
                 imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image";
            }
        } else if (initialCardImageUrl) { // TCGdex, not fetching, but no full card data yet or no image in it
            const lowRes = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp');
            if (lowRes) imageUrlToSet = lowRes;
             else imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image";
        } else {
            imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image";
        }
    } else if (initialCardImageUrl) { // For PokemonTCG.io or other sources
        imageUrlToSet = initialCardImageUrl;
    }
    setFinalDisplayImageUrl(imageUrlToSet);
  }, [initialCardImageUrl, tcgDexFullCard, isFetchingCardDetails, sourceApi]);

  // Effect for resetting general states when dialog opens/closes or source API changes
  useEffect(() => {
    if (!isOpen) {
      // Clear all when dialog closes
      setCurrentAvailableVariants([]);
      setSelectedVariant("");
      setSelectedCondition("");
      setChartData([]);
      // finalDisplayImageUrl is handled by its own effect
      return;
    }

    // Reset for new opening or API source change
    setSelectedCondition("");
    setChartData([]);
    // If the source is not TCGdex, ensure TCGdex-specific states are clear
    if (sourceApi !== 'tcgdex') {
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
    }
    // If the source is not PokemonTCG, ensure its specific states are clear
    if (sourceApi !== 'pokemontcg') {
        // This might overlap with TCGdex clearing, but ensures clean state
        // if propsAvailableVariants were from a previous PokemonTCG context.
         if (propsAvailableVariants && propsAvailableVariants.length >0) {
            setCurrentAvailableVariants([]);
            setSelectedVariant("");
        }
    }

  }, [isOpen, sourceApi]);


  // Effect for TCGdex variant population
  useEffect(() => {
    if (!isOpen || sourceApi !== 'tcgdex') {
      return; // Only run for TCGdex when open
    }

    if (isFetchingCardDetails) {
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
        return; 
    }
    
    // This block runs AFTER isFetchingCardDetails is false for TCGdex
    if (tcgDexFullCard && tcgDexFullCard.prices) {
        const variantsFromTcgDex = Object.keys(tcgDexFullCard.prices).filter(
            key => {
                const priceEntry = tcgDexFullCard.prices![key as keyof TcgDexCardPrices];
                return typeof priceEntry === 'object' && 
                       priceEntry !== null &&
                       priceEntry.market !== undefined && 
                       priceEntry.market !== null;
            }
        ).sort();
        
        setCurrentAvailableVariants(variantsFromTcgDex);

        let determinedDefault = "";
        if (variantsFromTcgDex.length > 0) {
          if (variantsFromTcgDex.includes("normal")) determinedDefault = "normal";
          else if (variantsFromTcgDex.includes("holofoil")) determinedDefault = "holofoil";
          else if (variantsFromTcgDex.includes("reverse")) determinedDefault = "reverse";
          else determinedDefault = variantsFromTcgDex[0];
        }
        setSelectedVariant(determinedDefault);
    } else { // No tcgDexFullCard or no prices object
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
    }
  }, [isOpen, sourceApi, isFetchingCardDetails, tcgDexFullCard]);

  // Effect for PokemonTCG.io variant population
  useEffect(() => {
    if (!isOpen || sourceApi !== 'pokemontcg') {
      return; // Only run for PokemonTCG when open
    }

    if (propsAvailableVariants) {
        setCurrentAvailableVariants(propsAvailableVariants);
        const initialVariant = propsDefaultVariant || (propsAvailableVariants.length > 0 ? propsAvailableVariants[0] : "");
        setSelectedVariant(initialVariant);
    } else {
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
    }
  }, [isOpen, sourceApi, propsAvailableVariants, propsDefaultVariant]);


  // Effect for Price Chart Data (TCGdex)
  useEffect(() => {
    if (sourceApi === 'tcgdex' && !isFetchingCardDetails && tcgDexFullCard?.prices && selectedVariant) {
      const currentPrices = tcgDexFullCard.prices;
      const newChartDataPoints: { name: string; price: number }[] = [];
      const selectedVariantPriceData = currentPrices[selectedVariant as keyof TcgDexCardPrices] as { market?: number | null };
      const selectedVariantMarketPrice = selectedVariantPriceData?.market;


      const isReverse = selectedVariant.toLowerCase().includes('reverse');

      if (isReverse) {
        if (currentPrices.reverseHoloAvg30 !== null && currentPrices.reverseHoloAvg30 !== undefined) newChartDataPoints.push({ name: "30d Avg", price: currentPrices.reverseHoloAvg30 });
        if (currentPrices.reverseHoloAvg7 !== null && currentPrices.reverseHoloAvg7 !== undefined) newChartDataPoints.push({ name: "7d Avg", price: currentPrices.reverseHoloAvg7 });
        if (currentPrices.reverseHoloAvg1 !== null && currentPrices.reverseHoloAvg1 !== undefined) newChartDataPoints.push({ name: "1d Avg", price: currentPrices.reverseHoloAvg1 });
      } else {
        // Check for general averages if not reverse, and they are numbers
        if (typeof currentPrices.avg30 === 'number') newChartDataPoints.push({ name: "30d Avg", price: currentPrices.avg30 });
        if (typeof currentPrices.avg7 === 'number') newChartDataPoints.push({ name: "7d Avg", price: currentPrices.avg7 });
        if (typeof currentPrices.avg1 === 'number') newChartDataPoints.push({ name: "1d Avg", price: currentPrices.avg1 });
      }
      
      if (selectedVariantMarketPrice !== null && selectedVariantMarketPrice !== undefined) {
        newChartDataPoints.push({ name: "Market", price: selectedVariantMarketPrice });
      } else if (!currentAvailableVariants.includes(selectedVariant) && typeof currentPrices.market === 'number') {
        // Fallback to general market if selectedVariant isn't a specific priced variant but general market exists
        newChartDataPoints.push({ name: "Market", price: currentPrices.market });
      }
      setChartData(newChartDataPoints.filter(p => p.price !== null && p.price !== undefined && !isNaN(p.price)));
    } else {
      setChartData([]); // Clear chart if not TCGdex, or fetching, or no data
    }
  }, [selectedVariant, tcgDexFullCard, isFetchingCardDetails, sourceApi, currentAvailableVariants]);


  const handleSubmit = () => {
    let variantToSave = "Normal"; // Default if no variants are selectable
    
    if (currentAvailableVariants.length > 0 && selectedVariant) {
      variantToSave = selectedVariant;
    } else if (sourceApi === 'pokemontcg' && propsAvailableVariants && propsAvailableVariants.length === 0) {
        // If pokemontcg and API explicitly returned no variants (e.g. only one version of card)
        variantToSave = "Normal"; // Or some other appropriate default like "" or "Standard"
    } else if (sourceApi === 'tcgdex' && currentAvailableVariants.length === 0 && !isFetchingCardDetails) {
        // If TCGdex, done fetching, and no priced variants were found, it defaults to "Normal"
        variantToSave = "Normal";
    }
    // If selectedVariant has a value (from dropdown), it will be used. Otherwise, variantToSave is "Normal".

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
            Select the condition 
            { (showVariantSelector && !(isFetchingCardDetails && sourceApi === 'tcgdex')) ? " and variant " : " " }
            of your card.
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
                unoptimized={sourceApi === 'tcgdex'} // TCGdex images can be varied, safer to unoptimize
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
                      {currentAvailableVariants.map((variant) => {
                        let priceDisplay = "";
                        if (sourceApi === 'tcgdex' && tcgDexFullCard?.prices) {
                            const priceInfo = tcgDexFullCard.prices[variant as keyof TcgDexCardPrices] as {market?: number | null};
                            if (priceInfo?.market !== undefined && priceInfo.market !== null) {
                                priceDisplay = ` ($${priceInfo.market.toFixed(2)})`;
                            }
                        } else if (sourceApi === 'pokemontcg' && tcgDexFullCard?.tcgplayer?.prices) { // Assuming tcgDexFullCard might be misnamed here and it's actually for pokemontcg
                            const priceInfo = tcgDexFullCard.tcgplayer.prices[variant as keyof TcgDexCardPrices] as {market?: number | null};
                             if (priceInfo?.market !== undefined && priceInfo.market !== null) {
                                priceDisplay = ` ($${priceInfo.market.toFixed(2)})`;
                            }
                        }
                        return (
                            <SelectItem key={variant} value={variant}>
                            {formatVariantKey(variant)}{priceDisplay}
                            </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(noPricedVariantsFoundForTcgDex || noVariantsForPokemonTcg) && !showVariantSelector && (
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

              {sourceApi === 'tcgdex' && !isFetchingCardDetails && tcgDexFullCard && chartData.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-2 text-center text-muted-foreground">
                    Price Snapshot for {formatVariantKey(selectedVariant)}
                  </h4>
                  <div className="h-[200px] w-full">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                      <BarChart 
                        accessibilityLayer 
                        data={chartData} 
                        margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                        <XAxis 
                          dataKey="name" 
                          tickLine={false} 
                          axisLine={false} 
                          fontSize={10} 
                          interval={0} 
                          padding={{ left: 10, right: 10 }}
                        />
                        <YAxis 
                          tickLine={false} 
                          axisLine={false} 
                          fontSize={10} 
                          domain={['auto', 'auto']} 
                          tickFormatter={(value) => `$${value.toFixed(2)}`} 
                        />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--muted))" }}
                          content={<ChartTooltipContent indicator="dot" nameKey="price" />}
                        />
                        <Bar dataKey="price" fill="var(--color-price)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>
              )}
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

  