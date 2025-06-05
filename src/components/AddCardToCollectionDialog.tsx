
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";


const formatVariantKey = (key: string): string => {
  if (!key) return "N/A";
  if (key === "firstEditionNormal") return "1st Edition Normal";
  if (key === "firstEditionHolofoil") return "1st Edition Holofoil";
  if (key === "reverseHolo" || key === "reverseHolofoil") return "Reverse Holo";
  if (key === "reverse") return "Reverse Holo"; 
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
        } else if (initialCardImageUrl) {
            const lowRes = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp');
            if (lowRes) imageUrlToSet = lowRes;
             else imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image+Available";
        } else {
            imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image+Data";
        }
    } else if (initialCardImageUrl) { // For PokemonTCG.io or other sources
        imageUrlToSet = initialCardImageUrl;
    }
    setFinalDisplayImageUrl(imageUrlToSet);
  }, [isOpen, initialCardImageUrl, tcgDexFullCard, isFetchingCardDetails, sourceApi]);

  // Effect for resetting general states when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCondition("");
      setChartData([]);
      // Variant states are handled by API-specific effects
      return;
    }
    // Reset when opening
    setSelectedCondition(""); 
    setChartData([]); 
  }, [isOpen]);


  // Effect for TCGdex variant population & default selection
  useEffect(() => {
    if (!isOpen || sourceApi !== 'tcgdex') {
        if (sourceApi !== 'tcgdex' && isOpen) { 
             setCurrentAvailableVariants([]);
             setSelectedVariant("");
        }
        return;
    }

    if (isFetchingCardDetails) {
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
        return;
    }

    // At this point, isOpen is true, sourceApi is 'tcgdex', and isFetchingCardDetails is false.
    // We should have tcgDexFullCard data.
    if (tcgDexFullCard && typeof tcgDexFullCard.prices === 'object' && tcgDexFullCard.prices !== null) {
        const actualPricedVariants: string[] = [];
        for (const key in tcgDexFullCard.prices) {
            // Ensure the key is an own property and not from the prototype chain
            if (Object.prototype.hasOwnProperty.call(tcgDexFullCard.prices, key)) {
                const priceEntry = tcgDexFullCard.prices[key];
                // Check if priceEntry is an object and has a numeric 'market' property
                if (typeof priceEntry === 'object' && priceEntry !== null && typeof priceEntry.market === 'number' && !isNaN(priceEntry.market)) {
                    actualPricedVariants.push(key);
                }
            }
        }
        actualPricedVariants.sort(); // Sort for consistent order
        setCurrentAvailableVariants(actualPricedVariants);

        if (actualPricedVariants.length > 0) {
            let determinedDefault = "";
            if (actualPricedVariants.includes("normal")) determinedDefault = "normal";
            else if (actualPricedVariants.includes("holofoil")) determinedDefault = "holofoil";
            else if (actualPricedVariants.includes("reverseHolo")) determinedDefault = "reverseHolo";
            else if (actualPricedVariants.includes("reverse")) determinedDefault = "reverse"; // General reverse as fallback
            else determinedDefault = actualPricedVariants[0]; // Fallback to the first one found
            setSelectedVariant(determinedDefault);
        } else {
            // No priced variants with a 'market' value were found in tcgDexFullCard.prices
            setSelectedVariant("");
        }
    } else {
        // tcgDexFullCard.prices is undefined, null, or not an object.
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
    }
  }, [isOpen, sourceApi, isFetchingCardDetails, tcgDexFullCard]);


  // Effect for PokemonTCG.io variant population
  useEffect(() => {
    if (!isOpen || sourceApi !== 'pokemontcg') {
       if (sourceApi !== 'pokemontcg' && isOpen) { 
         setCurrentAvailableVariants([]);
         setSelectedVariant("");
      }
      return;
    }

    if (propsAvailableVariants) {
        setCurrentAvailableVariants(propsAvailableVariants.sort());
        const initialVariant = propsDefaultVariant || (propsAvailableVariants.length > 0 ? propsAvailableVariants[0] : "");
        setSelectedVariant(initialVariant);
    } else {
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
    }
  }, [isOpen, sourceApi, propsAvailableVariants, propsDefaultVariant]);


  // Effect for Chart Data population (primarily for TCGdex)
  useEffect(() => {
    if (sourceApi === 'tcgdex' && !isFetchingCardDetails && tcgDexFullCard?.prices && selectedVariant && currentAvailableVariants.includes(selectedVariant)) {
      const currentPrices = tcgDexFullCard.prices;
      const newChartDataPoints: { name: string; price: number }[] = [];
      
      const selectedVariantPriceData = currentPrices[selectedVariant as keyof TcgDexCardPrices] as { market?: number | null };
      const selectedVariantMarketPrice = selectedVariantPriceData?.market;

      const isSelectedVariantReverse = selectedVariant.toLowerCase().includes('reverse');

      if (isSelectedVariantReverse) {
        if (typeof currentPrices.reverseHoloAvg30 === 'number' && !isNaN(currentPrices.reverseHoloAvg30)) newChartDataPoints.push({ name: "30d Avg", price: currentPrices.reverseHoloAvg30 });
        if (typeof currentPrices.reverseHoloAvg7 === 'number' && !isNaN(currentPrices.reverseHoloAvg7)) newChartDataPoints.push({ name: "7d Avg", price: currentPrices.reverseHoloAvg7 });
        if (typeof currentPrices.reverseHoloAvg1 === 'number' && !isNaN(currentPrices.reverseHoloAvg1)) newChartDataPoints.push({ name: "1d Avg", price: currentPrices.reverseHoloAvg1 });
      } else {
        if (typeof currentPrices.avg30 === 'number' && !isNaN(currentPrices.avg30)) newChartDataPoints.push({ name: "30d Avg", price: currentPrices.avg30 });
        if (typeof currentPrices.avg7 === 'number' && !isNaN(currentPrices.avg7)) newChartDataPoints.push({ name: "7d Avg", price: currentPrices.avg7 });
        if (typeof currentPrices.avg1 === 'number' && !isNaN(currentPrices.avg1)) newChartDataPoints.push({ name: "1d Avg", price: currentPrices.avg1 });
      }

      if (typeof selectedVariantMarketPrice === 'number' && !isNaN(selectedVariantMarketPrice)) {
        newChartDataPoints.push({ name: "Market", price: selectedVariantMarketPrice });
      }
      
      setChartData(newChartDataPoints.filter(p => p.price > 0).sort((a,b) => {
         const order = ["1d Avg", "7d Avg", "30d Avg", "Market"];
         return order.indexOf(a.name) - order.indexOf(b.name);
      }));
    } else {
      setChartData([]); // Clear chart data if conditions not met
    }
  }, [selectedVariant, tcgDexFullCard, isFetchingCardDetails, sourceApi, currentAvailableVariants]);


  const handleSubmit = () => {
    let variantToSave = "Normal"; 
    if (currentAvailableVariants.length > 0 && selectedVariant) {
      variantToSave = selectedVariant;
    } else if (currentAvailableVariants.length === 0 && sourceApi === 'tcgdex' && !isFetchingCardDetails) {
      variantToSave = "Normal"; 
    } else if (currentAvailableVariants.length === 0 && sourceApi === 'pokemontcg') {
       variantToSave = "Normal";
    }


    if (selectedCondition) {
      onAddCard(selectedCondition, variantToSave);
      onClose(); 
    }
  };

  const showVariantSelector = currentAvailableVariants.length > 0 && !(isFetchingCardDetails && sourceApi === 'tcgdex');
  
  const noPricedVariantsFoundForTcgDex = sourceApi === 'tcgdex' && 
                                         !isFetchingCardDetails && 
                                         tcgDexFullCard !== null && 
                                         currentAvailableVariants.length === 0;
  
  const noVariantsForPokemonTcg = sourceApi === 'pokemontcg' && 
                                  (!propsAvailableVariants || propsAvailableVariants.length === 0);


  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setFinalDisplayImageUrl("https://placehold.co/200x280.png/CCCCCC/333333?text=Image+Error");
  };

  const dialogDescriptionText = `Select the condition${ (showVariantSelector || (sourceApi === 'pokemontcg' && propsAvailableVariants && propsAvailableVariants.length > 0)) ? " and variant " : " " }of your card.`;
  
  const isAddButtonDisabled = (isFetchingCardDetails && sourceApi === 'tcgdex') || 
                              !selectedCondition || 
                              (showVariantSelector && !selectedVariant);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add "{cardName}" to Collection</DialogTitle>
          <DialogDescription>
            {dialogDescriptionText}
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
                      {currentAvailableVariants.map((variantKey) => {
                        let priceDisplay = "";
                        if (sourceApi === 'tcgdex' && tcgDexFullCard?.prices) {
                            const priceDetail = tcgDexFullCard.prices[variantKey as keyof TcgDexCardPrices] as { market?: number | null };
                            if (priceDetail && typeof priceDetail.market === 'number' && !isNaN(priceDetail.market) ) {
                                priceDisplay = ` ($${priceDetail.market.toFixed(2)})`;
                            }
                        } else if (sourceApi === 'pokemontcg' && propsAvailableVariants?.includes(variantKey)) {
                            // PokemonTCG.io prices are part of the `value` prop passed to onAddCard, not directly shown here.
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
            disabled={isAddButtonDisabled}
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
