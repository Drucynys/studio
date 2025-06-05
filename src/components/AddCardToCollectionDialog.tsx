
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
  if (key === "holofoil") return "Holofoil";
  if (key === "normal") return "Normal";

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
        } else if (initialCardImageUrl) { // Fallback if tcgDexFullCard.image is not yet available or missing
            const lowRes = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp');
            if (lowRes) imageUrlToSet = lowRes;
             else imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image+Available";
        } else { // Absolute fallback
            imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image+Data";
        }
    } else if (initialCardImageUrl) { // For pokemontcg or other APIs
        imageUrlToSet = initialCardImageUrl;
    }
    setFinalDisplayImageUrl(imageUrlToSet);
  }, [isOpen, initialCardImageUrl, tcgDexFullCard, isFetchingCardDetails, sourceApi]);

  // Effect for resetting general states when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Clear all relevant states when dialog closes
      setCurrentAvailableVariants([]);
      setSelectedVariant("");
      setSelectedCondition("");
      setChartData([]);
      return; // Early exit if dialog is not open
    }
    // Reset condition and chart data when dialog opens (variants are handled by specific effects)
    setSelectedCondition("");
    setChartData([]);
  }, [isOpen]);


  // Effect for TCGdex variant population & default selection
  useEffect(() => {
    if (!isOpen || sourceApi !== 'tcgdex') {
      // If not open or not for TCGdex, ensure variants are cleared and bail
      if (sourceApi !== 'tcgdex') { // Ensure this runs if API source changes away from TCGdex while open
         setCurrentAvailableVariants([]);
         setSelectedVariant("");
      }
      return;
    }
  
    if (isFetchingCardDetails) {
      // Still fetching details, clear variants and wait
      setCurrentAvailableVariants([]);
      setSelectedVariant("");
      return;
    }
  
    // Fetching is complete (isFetchingCardDetails is false), now process tcgDexFullCard
    if (tcgDexFullCard && tcgDexFullCard.prices) {
      const pricedVariants = Object.keys(tcgDexFullCard.prices).filter(key => {
        const priceDetail = tcgDexFullCard.prices[key as keyof TcgDexCardPrices];
        return typeof priceDetail === 'object' &&
               priceDetail !== null &&
               typeof priceDetail.market === 'number' &&
               !isNaN(priceDetail.market);
      }).sort();
  
      setCurrentAvailableVariants(pricedVariants);
  
      let determinedDefault = "";
      if (pricedVariants.length > 0) {
        // Prioritize common variants for default selection
        if (pricedVariants.includes("normal")) determinedDefault = "normal";
        else if (pricedVariants.includes("holofoil")) determinedDefault = "holofoil";
        else if (pricedVariants.includes("reverseHolo")) determinedDefault = "reverseHolo"; // Key for Shroomish (swsh8-1)
        else if (pricedVariants.includes("reverse")) determinedDefault = "reverse"; // Another potential key for reverse from TCGdex
        else determinedDefault = pricedVariants[0]; // Fallback to the first available variant
      }
      setSelectedVariant(determinedDefault);
    } else {
      // No card details or no prices after fetch, clear variants
      setCurrentAvailableVariants([]);
      setSelectedVariant("");
    }
  }, [isOpen, sourceApi, isFetchingCardDetails, tcgDexFullCard]); // Dependencies are critical

  // Effect for PokemonTCG.io variant population
  useEffect(() => {
    if (!isOpen || sourceApi !== 'pokemontcg') {
       if (sourceApi !== 'pokemontcg') { // Ensure this runs if API source changes away from pokemontcg while open
         setCurrentAvailableVariants([]);
         setSelectedVariant("");
      }
      return;
    }

    // For PokemonTCG.io, variants are directly provided
    if (propsAvailableVariants) {
        setCurrentAvailableVariants(propsAvailableVariants.sort()); // Sort for consistent order
        const initialVariant = propsDefaultVariant || (propsAvailableVariants.length > 0 ? propsAvailableVariants[0] : "");
        setSelectedVariant(initialVariant);
    } else {
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
    }
  }, [isOpen, sourceApi, propsAvailableVariants, propsDefaultVariant]);


  // Effect for Price Chart Data (TCGdex)
  useEffect(() => {
    if (sourceApi === 'tcgdex' && !isFetchingCardDetails && tcgDexFullCard?.prices && selectedVariant && currentAvailableVariants.includes(selectedVariant)) {
      const currentPrices = tcgDexFullCard.prices;
      const newChartDataPoints: { name: string; price: number }[] = [];
      
      const selectedVariantPriceData = currentPrices[selectedVariant as keyof TcgDexCardPrices] as { market?: number | null };
      const selectedVariantMarketPrice = selectedVariantPriceData?.market;

      // Determine if selectedVariant is a reverse type for TCGdex (keys "reverse" or "reverseHolo")
      const isSelectedVariantReverse = selectedVariant.toLowerCase().includes('reverse');

      if (isSelectedVariantReverse) {
        if (typeof currentPrices.reverseHoloAvg30 === 'number' && !isNaN(currentPrices.reverseHoloAvg30)) newChartDataPoints.push({ name: "30d Avg", price: currentPrices.reverseHoloAvg30 });
        if (typeof currentPrices.reverseHoloAvg7 === 'number' && !isNaN(currentPrices.reverseHoloAvg7)) newChartDataPoints.push({ name: "7d Avg", price: currentPrices.reverseHoloAvg7 });
        if (typeof currentPrices.reverseHoloAvg1 === 'number' && !isNaN(currentPrices.reverseHoloAvg1)) newChartDataPoints.push({ name: "1d Avg", price: currentPrices.reverseHoloAvg1 });
      } else {
        // For non-reverse variants (normal, holofoil, etc.)
        if (typeof currentPrices.avg30 === 'number' && !isNaN(currentPrices.avg30)) newChartDataPoints.push({ name: "30d Avg", price: currentPrices.avg30 });
        if (typeof currentPrices.avg7 === 'number' && !isNaN(currentPrices.avg7)) newChartDataPoints.push({ name: "7d Avg", price: currentPrices.avg7 });
        if (typeof currentPrices.avg1 === 'number' && !isNaN(currentPrices.avg1)) newChartDataPoints.push({ name: "1d Avg", price: currentPrices.avg1 });
      }

      // Add the market price for the specific selected variant
      if (typeof selectedVariantMarketPrice === 'number' && !isNaN(selectedVariantMarketPrice)) {
        newChartDataPoints.push({ name: "Market", price: selectedVariantMarketPrice });
      }
      
      setChartData(newChartDataPoints.filter(p => p.price > 0).sort((a,b) => {
         // Consistent sort order for chart bars
         const order = ["1d Avg", "7d Avg", "30d Avg", "Market"];
         return order.indexOf(a.name) - order.indexOf(b.name);
      }));
    } else {
      setChartData([]); // Clear chart data if conditions are not met
    }
  }, [selectedVariant, tcgDexFullCard, isFetchingCardDetails, sourceApi, currentAvailableVariants]);


  const handleSubmit = () => {
    // Default variantToSave to "Normal" or the selected variant if available
    let variantToSave = "Normal"; 
    if (currentAvailableVariants.length > 0 && selectedVariant) {
      variantToSave = selectedVariant;
    } else if (currentAvailableVariants.length === 0 && !(isFetchingCardDetails && sourceApi === 'tcgdex')) {
      // If no variants were available (and not in a loading state for TCGdex), default to "Normal"
      variantToSave = "Normal"; 
    }


    if (selectedCondition) { // Condition must always be selected
      onAddCard(selectedCondition, variantToSave);
      onClose(); // Close dialog after adding
    }
  };

  // Determine if the variant selector should be shown
  const showVariantSelector = currentAvailableVariants.length > 0 && !(isFetchingCardDetails && sourceApi === 'tcgdex');
  
  // Determine if "No priced variants found" message should be shown for TCGdex
  const noPricedVariantsFoundForTcgDex = sourceApi === 'tcgdex' && 
                                         !isFetchingCardDetails && 
                                         tcgDexFullCard !== null && // Ensure card details were attempted/loaded
                                         currentAvailableVariants.length === 0;
  
  // Determine if "No variants" message should be shown for PokemonTCG.io
  const noVariantsForPokemonTcg = sourceApi === 'pokemontcg' && 
                                  (!propsAvailableVariants || propsAvailableVariants.length === 0);


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
            { (showVariantSelector || (sourceApi === 'pokemontcg' && propsAvailableVariants && propsAvailableVariants.length > 0) ) ? " and variant " : " " }
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
                unoptimized={sourceApi === 'tcgdex'} // TCGdex images might not need Next.js optimization if already optimized
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
                      {currentAvailableVariants.map((variantKey) => {
                        let priceDisplay = "";
                        if (sourceApi === 'tcgdex' && tcgDexFullCard?.prices) {
                            const priceDetail = tcgDexFullCard.prices[variantKey as keyof TcgDexCardPrices];
                            if (typeof priceDetail === 'object' && priceDetail !== null && typeof priceDetail.market === 'number') {
                                priceDisplay = ` ($${priceDetail.market.toFixed(2)})`;
                            }
                        } else if (sourceApi === 'pokemontcg' && propsAvailableVariants?.includes(variantKey)) {
                            // PokemonTCG.io prices are passed differently, not directly displayed here.
                            // Value is obtained via getMarketPriceForVariant in parent component
                        }

                        return (
                            <SelectItem key={variantKey} value={variantKey}>
                            {formatVariantKey(variantKey)}{priceDisplay}
                            </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              { (noPricedVariantsFoundForTcgDex || noVariantsForPokemonTcg) && !showVariantSelector && (
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

              {/* Price Chart for TCGdex */}
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
                        margin={{ top: 5, right: 5, left: -25, bottom: 5 }} // Adjusted left margin for YAxis labels
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          fontSize={10}
                          interval={0} // Show all labels if space allows
                          padding={{ left: 10, right: 10 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          fontSize={10}
                          domain={['auto', 'auto']} // Auto-scale Y axis
                          tickFormatter={(value) => `$${value.toFixed(2)}`} // Format Y-axis ticks as currency
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

    