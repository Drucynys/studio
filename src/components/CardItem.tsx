
import type { PokemonCard, CardmarketProduct, CardmarketPriceGuide } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Coins, Sparkles, ShieldCheck, ExternalLink, Palette, Edit3, Trash2, Layers, ShoppingCart } from "lucide-react"; // Added ShoppingCart for CM
import React, { useState, useEffect } from "react";

type CardItemProps = {
  card: PokemonCard;
  onEdit: () => void;
  onRemove: () => void;
  cardmarketPriceGuide: CardmarketPriceGuide | null;
};

const formatDisplayVariant = (variantKey?: string): string | null => {
  if (!variantKey) return null;
  return variantKey
    .replace(/([A-Z0-9])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

// Basic normalization for matching
const normalizeString = (str: string = ""): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/gi, ''); // Keep only alphanumeric
};

export function CardItem({ card, onEdit, onRemove, cardmarketPriceGuide }: CardItemProps) {
  const tcgPlayerSearchUrl = `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeURIComponent(card.name || '')}${card.variant ? '&ProductTypeName=' + encodeURIComponent(card.variant) : ''}&view=grid`;
  const displayVariant = formatDisplayVariant(card.variant);

  const [cmPrices, setCmPrices] = useState<CardmarketProduct | null>(null);

  useEffect(() => {
    if (cardmarketPriceGuide && card.name && card.set) {
      const normalizedCardName = normalizeString(card.name);
      const normalizedCardSet = normalizeString(card.set);
      // Attempt to find a match. This logic can be quite complex due to name/set variations.
      // For now, a simple includes match for name and exact (normalized) for set.
      // Cardmarket's "Expansion" often includes series info, e.g., "Sword & Shield: Rebel Clash"
      // PokemonTCG.io set name might be "Rebel Clash".
      // We might need a more robust mapping or smarter normalization.
      
      const foundProduct = cardmarketPriceGuide.find(cmProduct => {
        const normalizedCmName = normalizeString(cmProduct.Name);
        const normalizedCmSet = normalizeString(cmProduct.Expansion);
        
        // Check if PokemonTCG set name is part of Cardmarket expansion name
        // and PokemonTCG card name is part of Cardmarket card name.
        // This is a common pattern.
        return normalizedCmName.includes(normalizedCardName) && 
               normalizedCmSet.includes(normalizedCardSet);
      });

      setCmPrices(foundProduct || null);
    } else {
      setCmPrices(null);
    }
  }, [card, cardmarketPriceGuide]);

  return (
    <Card className="shadow-lg hover:shadow-primary/20 transition-shadow duration-300 flex flex-col bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-headline text-lg leading-tight">
          {card.name || `${card.set} #${card.cardNumber}`}
        </CardTitle>
        {card.name && <CardDescription className="text-xs">{card.set} #{card.cardNumber}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2 flex-grow pb-3">
        {card.imageUrl ? (
            <div className="relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden mb-2 shadow-inner">
                 <Image src={card.imageUrl} alt={card.name || card.cardNumber} width={250} height={350} className="object-contain w-full h-full" data-ai-hint="pokemon card front"/>
            </div>
        ) : (
            <div className="relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden mb-2 bg-muted flex items-center justify-center" data-ai-hint="pokemon card blank">
                 <Sparkles className="h-16 w-16 text-muted-foreground opacity-50" />
            </div>
        )}
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <strong>Rarity:</strong> <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{card.rarity}</Badge>
        </div>
        {displayVariant && (
          <div className="flex items-center gap-2 text-xs">
            <Palette className="h-3.5 w-3.5 text-blue-500" />
            <strong>Variant:</strong> <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-blue-500/50 text-blue-600">{displayVariant}</Badge>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="h-3.5 w-3.5 text-green-500" /> 
          <strong>Condition:</strong> <Badge variant="outline" className="text-xs px-1.5 py-0.5">{card.condition}</Badge>
        </div>
         <div className="flex items-center gap-2 text-xs">
          <Layers className="h-3.5 w-3.5 text-purple-500" /> 
          <strong>Quantity:</strong> <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-purple-500/50 text-purple-600">{card.quantity}</Badge>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start space-y-2 pt-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Coins className="h-4 w-4" />
          TCGPlayer Value: ${card.value.toFixed(2)} (x{card.quantity} = ${(card.value * card.quantity).toFixed(2)})
        </div>
        {card.name && (
           <a
            href={tcgPlayerSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center gap-1"
          >
            View on TCGPlayer <ExternalLink size={12} />
          </a>
        )}

        {cmPrices && (cmPrices["Low Price"] || cmPrices["Trend Price"] || cmPrices["Average Sell Price"]) && (
          <div className="mt-1 pt-1 border-t border-border/30 w-full">
            <p className="text-xs font-semibold text-blue-600 flex items-center gap-1 my-1">
              <ShoppingCart size={12}/> Cardmarket (EUR):
            </p>
            {typeof cmPrices["Average Sell Price"] === 'number' && <p className="text-xs">Avg Sell: €{cmPrices["Average Sell Price"].toFixed(2)}</p>}
            {typeof cmPrices["Trend Price"] === 'number' && <p className="text-xs">Trend: €{cmPrices["Trend Price"].toFixed(2)}</p>}
            {typeof cmPrices["Low Price"] === 'number' && <p className="text-xs">Low: €{cmPrices["Low Price"].toFixed(2)}</p>}
            {cmPrices.idProduct && 
                <a 
                    href={`https://www.cardmarket.com/en/Pokemon/Products/Singles/${cmPrices.Expansion}/${cmPrices.Name}?idProduct=${cmPrices.idProduct}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                >
                    View on Cardmarket <ExternalLink size={12} />
                </a>
            }
          </div>
        )}
        
        <div className="flex gap-2 w-full mt-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
            <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onRemove} className="flex-1">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
