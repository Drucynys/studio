
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
  availableVariants?: string[]; // These are the price keys themselves
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
  availableVariants: propsAvailableVariants, // Renamed for clarity from PokemonTCG.io
  defaultVariant: propsDefaultVariant,     // Renamed for clarity from PokemonTCG.io
  tcgDexFullCard,
  isFetchingCardDetails,
  onAddCard,
}: AddCardToCollectionDialogProps) {
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [currentAvailableVariants, setCurrentAvailableVariants] = useState<string[]>([]); // Stores price keys
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
        } else if (initialCardImageUrl) { // Fallback if tcgDexFullCard.image is somehow missing post-fetch
            const lowRes = getSafeTcgDexCardImageUrl(initialCardImageUrl, 'low', 'webp');
            if (lowRes) imageUrlToSet = lowRes;
             else imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image";
        } else { // Absolute fallback
            imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image";
        }
    } else if (initialCardImageUrl) { // PokemonTCG.io or general fallback
        imageUrlToSet = initialCardImageUrl;
    }
    setFinalDisplayImageUrl(imageUrlToSet);
  }, [isOpen, initialCardImageUrl, tcgDexFullCard, isFetchingCardDetails, sourceApi]);

  // Effect for resetting general states when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Clear states that should be reset when dialog closes
      setCurrentAvailableVariants([]);
      setSelectedVariant("");
      setSelectedCondition("");
      setChartData([]);
      // finalDisplayImageUrl will be reset by the other effect when isOpen becomes true again
      return;
    }
    // Reset condition and chart data for any new opening
    setSelectedCondition("");
    setChartData([]);
    // Variant states are handled by API-specific effects below
  }, [isOpen]);


  // Effect for TCGdex variant population & default selection
  useEffect(() => {
    if (!isOpen || sourceApi !== 'tcgdex') {
      return;
    }

    if (isFetchingCardDetails) {
        setCurrentAvailableVariants([]);
        setSelectedVariant(""); // Clear variant while fetching
        return;
    }

    // This block runs when isOpen, sourceApi is 'tcgdex', and isFetchingCardDetails is false
    if (tcgDexFullCard && tcgDexFullCard.prices) {
        const pricedVariants = Object.keys(tcgDexFullCard.prices).filter(key => {
            const priceDetail = tcgDexFullCard.prices![key as keyof TcgDexCardPrices];
            return typeof priceDetail === 'object' && priceDetail !== null && typeof priceDetail.market === 'number' && !isNaN(priceDetail.market);
        }).sort();

        setCurrentAvailableVariants(pricedVariants);

        let determinedDefault = "";
        if (pricedVariants.length > 0) {
          if (pricedVariants.includes("normal")) determinedDefault = "normal";
          else if (pricedVariants.includes("holofoil")) determinedDefault = "holofoil"; // Corrected typo
          else if (pricedVariants.includes("reverseHolo")) determinedDefault = "reverseHolo";
          else determinedDefault = pricedVariants[0]; // Fallback to the first priced variant
        }
        setSelectedVariant(determinedDefault);
    } else {
        // No tcgDexFullCard or no .prices after fetch, so no variants to show.
        setCurrentAvailableVariants([]);
        setSelectedVariant("");
    }
  }, [isOpen, sourceApi, isFetchingCardDetails, tcgDexFullCard]);

  // Effect for PokemonTCG.io variant population
  useEffect(() => {
    if (!isOpen || sourceApi !== 'pokemontcg') {
      return;
    }
    // No fetching state for PokemonTCG.io in this dialog, variants passed directly
    if (propsAvailableVariants) { // These are already filtered price keys from the parent
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
    if (sourceApi === 'tcgdex' && !isFetchingCardDetails && tcgDexFullCard?.prices && selectedVariant && currentAvailableVariants.includes(selectedVariant)) {
      const currentPrices = tcgDexFullCard.prices;
      const newChartDataPoints: { name: string; price: number }[] = [];
      
      // Price data for the *selected* variant
      const selectedVariantPriceData = currentPrices[selectedVariant as keyof TcgDexCardPrices] as { market?: number | null };
      const selectedVariantMarketPrice = selectedVariantPriceData?.market;

      // TCGdex uses 'reverseHoloAvg1/7/30' for its reverse variant trend pricing keys.
      // For other variants like 'normal' or 'holofoil', it uses 'avg1/7/30'.
      const isSelectedVariantReverse = selectedVariant.toLowerCase().includes('reverse'); // A bit broad, but covers reverseHolo

      if (isSelectedVariantReverse) {
        if (typeof currentPrices.reverseHoloAvg30 === 'number' && !isNaN(currentPrices.reverseHoloAvg30)) newChartDataPoints.push({ name: "30d Avg", price: currentPrices.reverseHoloAvg30 });
        if (typeof currentPrices.reverseHoloAvg7 === 'number' && !isNaN(currentPrices.reverseHoloAvg7)) newChartDataPoints.push({ name: "7d Avg", price: currentPrices.reverseHoloAvg7 });
        if (typeof currentPrices.reverseHoloAvg1 === 'number' && !isNaN(currentPrices.reverseHoloAvg1)) newChartDataPoints.push({ name: "1d Avg", price: currentPrices.reverseHoloAvg1 });
      } else { // For 'normal', 'holofoil', etc.
        if (typeof currentPrices.avg30 === 'number' && !isNaN(currentPrices.avg30)) newChartDataPoints.push({ name: "30d Avg", price: currentPrices.avg30 });
        if (typeof currentPrices.avg7 === 'number' && !isNaN(currentPrices.avg7)) newChartDataPoints.push({ name: "7d Avg", price: currentPrices.avg7 });
        if (typeof currentPrices.avg1 === 'number' && !isNaN(currentPrices.avg1)) newChartDataPoints.push({ name: "1d Avg", price: currentPrices.avg1 });
      }

      if (typeof selectedVariantMarketPrice === 'number' && !isNaN(selectedVariantMarketPrice)) {
        newChartDataPoints.push({ name: "Market", price: selectedVariantMarketPrice });
      }
      
      setChartData(newChartDataPoints.filter(p => p.price > 0).sort((a,b) => { // Sort for consistent display order
         const order = ["1d Avg", "7d Avg", "30d Avg", "Market"];
         return order.indexOf(a.name) - order.indexOf(b.name);
      }));
    } else {
      setChartData([]); // Clear chart if conditions not met
    }
  }, [selectedVariant, tcgDexFullCard, isFetchingCardDetails, sourceApi, currentAvailableVariants]);


  const handleSubmit = () => {
    // Default variant if none selected or available (should be rare with new logic)
    let variantToSave = selectedVariant || "Normal"; 

    if (currentAvailableVariants.length > 0 && selectedVariant) {
      variantToSave = selectedVariant; // Use the actual key like "normal", "reverseHolo"
    } else if (currentAvailableVariants.length === 0 && !isFetchingCardDetails) {
      // If no variants were found (e.g. TCGdex card has no market prices for any finish)
      variantToSave = "Normal"; 
    }


    if (selectedCondition) {
      onAddCard(selectedCondition, variantToSave);
      onClose(); // onClose should reset states via its own effect or by remounting
    }
  };

  const showVariantSelector = currentAvailableVariants.length > 0 && !(isFetchingCardDetails && sourceApi === 'tcgdex');
  
  // Message for TCGdex if no priced variants were found *after* fetching
  const noPricedVariantsFoundForTcgDex = sourceApi === 'tcgdex' && 
                                         !isFetchingCardDetails && 
                                         tcgDexFullCard !== null && // Ensure card details were attempted
                                         currentAvailableVariants.length === 0;
  
  // Message for PokemonTCG.io if variants weren't passed (less likely with current parent logic)
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
            { showVariantSelector ? " and variant " : " " }
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
                      {currentAvailableVariants.map((variantKey) => {
                        let priceDisplay = "";
                        if (sourceApi === 'tcgdex' && tcgDexFullCard?.prices) {
                            const priceDetail = tcgDexFullCard.prices[variantKey as keyof TcgDexCardPrices];
                            if (typeof priceDetail === 'object' && priceDetail !== null && typeof priceDetail.market === 'number') {
                                priceDisplay = ` ($${priceDetail.market.toFixed(2)})`;
                            }
                        } else if (sourceApi === 'pokemontcg' && propsAvailableVariants?.includes(variantKey)) {
                            // For PokemonTCG.io, prices are fetched by parent. This dialog doesn't have direct access to the full original card object
                            // To show price here for PokemonTCG.io, the parent would need to pass down price data mapped to variant keys.
                            // For now, PokemonTCG.io variant dropdown items won't show price.
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

              { (noPricedVariantsFoundForTcgDex || noVariantsForPokemonTcg) && !showVariantS<ctrl61>elector && (
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

