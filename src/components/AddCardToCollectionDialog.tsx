
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
import type { TcgDexCard, TcgDexCardPrices } from "@/types/tcgdex"; 
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
        } else if (initialCardImageUrl) { 
            const lowRes = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp');
            if (lowRes) imageUrlToSet = lowRes;
             else imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image";
        } else {
            imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image";
        }
    } else if (initialCardImageUrl) { 
        imageUrlToSet = initialCardImageUrl;
    }
    setFinalDisplayImageUrl(imageUrlToSet);
  }, [isOpen, initialCardImageUrl, tcgDexFullCard, isFetchingCardDetails, sourceApi]);

  // Effect for resetting general states when dialog opens/closes or source API changes
  useEffect(() => {
    if (!isOpen) {
      setCurrentAvailableVariants([]);
      setSelectedVariant("");
      setSelectedCondition("");
      setChartData([]);
      return;
    }
    // Reset for new opening
    setSelectedCondition(""); // Always reset condition
    setChartData([]); // Always reset chart data

    // API-specific resets are handled in their dedicated useEffects
  }, [isOpen]);


  // Effect for TCGdex variant population
  useEffect(() => {
    if (!isOpen || sourceApi !== 'tcgdex') {
      return; 
    }

    if (isFetchingCardDetails) {
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
        return; 
    }
    
    if (tcgDexFullCard && tcgDexFullCard.prices) {
        const variantsFromTcgDex = Object.keys(tcgDexFullCard.prices).filter(
            key => {
                const priceEntry = tcgDexFullCard.prices![key as keyof TcgDexCardPrices];
                return typeof priceEntry === 'object' && 
                       priceEntry !== null &&
                       typeof priceEntry.market === 'number' && // Market price must be a number
                       !isNaN(priceEntry.market); // And not NaN
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
    } else { 
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
    }
  }, [isOpen, sourceApi, isFetchingCardDetails, tcgDexFullCard]);

  // Effect for PokemonTCG.io variant population
  useEffect(() => {
    if (!isOpen || sourceApi !== 'pokemontcg') {
      return; 
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
        if (typeof currentPrices.reverseHoloAvg30 === 'number') newChartDataPoints.push({ name: "30d Avg", price: currentPrices.reverseHoloAvg30 });
        if (typeof currentPrices.reverseHoloAvg7 === 'number') newChartDataPoints.push({ name: "7d Avg", price: currentPrices.reverseHoloAvg7 });
        if (typeof currentPrices.reverseHoloAvg1 === 'number') newChartDataPoints.push({ name: "1d Avg", price: currentPrices.reverseHoloAvg1 });
      } else {
        if (typeof currentPrices.avg30 === 'number') newChartDataPoints.push({ name: "30d Avg", price: currentPrices.avg30 });
        if (typeof currentPrices.avg7 === 'number') newChartDataPoints.push({ name: "7d Avg", price: currentPrices.avg7 });
        if (typeof currentPrices.avg1 === 'number') newChartDataPoints.push({ name: "1d Avg", price: currentPrices.avg1 });
      }
      
      if (typeof selectedVariantMarketPrice === 'number') {
        newChartDataPoints.push({ name: "Market", price: selectedVariantMarketPrice });
      } else if (!currentAvailableVariants.includes(selectedVariant) && typeof currentPrices.market === 'number') {
        newChartDataPoints.push({ name: "Market", price: currentPrices.market });
      }
      setChartData(newChartDataPoints.filter(p => typeof p.price === 'number' && !isNaN(p.price)));
    } else {
      setChartData([]); 
    }
  }, [selectedVariant, tcgDexFullCard, isFetchingCardDetails, sourceApi, currentAvailableVariants]);


  const handleSubmit = () => {
    let variantToSave = "Normal"; 
    
    if (currentAvailableVariants.length > 0 && selectedVariant) {
      variantToSave = selectedVariant;
    } else if (sourceApi === 'pokemontcg' && propsAvailableVariants && propsAvailableVariants.length === 0) {
        variantToSave = "Normal"; 
    } else if (sourceApi === 'tcgdex' && currentAvailableVariants.length === 0 && !isFetchingCardDetails) {
        variantToSave = "Normal";
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
                            if (typeof priceInfo?.market === 'number') {
                                priceDisplay = ` ($${priceInfo.market.toFixed(2)})`;
                            }
                        } else if (sourceApi === 'pokemontcg' && tcgDexFullCard && 'tcgplayer' in tcgDexFullCard && tcgDexFullCard.tcgplayer?.prices) { 
                            const priceInfo = tcgDexFullCard.tcgplayer.prices[variant as keyof TcgDexCardPrices] as {market?: number | null};
                             if (typeof priceInfo?.market === 'number') {
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
