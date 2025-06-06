
import type { PokemonCard, CardmarketProduct, CardmarketPriceGuide } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Coins, Sparkles, ShieldCheck, ExternalLink, Palette, Edit3, Trash2, Layers, ShoppingCart, Info, Eye } from "lucide-react";
import React, { useState, useEffect } from "react";

type CardItemProps = {
  card: PokemonCard;
  cardIndex: number; // Index of the card in the list
  onEdit: () => void;
  onRemove: () => void;
  onView: (cardIndex: number) => void; // Handler for viewing the card
  cardmarketPriceGuide: CardmarketPriceGuide | null;
};

const formatDisplayVariant = (variantKey?: string): string | null => {
  if (!variantKey) return null;
  return variantKey
    .replace(/([A-Z0-9])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const normalizeString = (str: string = ""): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/gi, ''); 
};

export function CardItem({ card, cardIndex, onEdit, onRemove, onView, cardmarketPriceGuide }: CardItemProps) {
  const tcgPlayerSearchUrl = `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeURIComponent(card.name || '')}${card.variant ? '&ProductTypeName=' + encodeURIComponent(card.variant) : ''}&view=grid`;
  const displayVariant = formatDisplayVariant(card.variant);

  const [cmPrices, setCmPrices] = useState<CardmarketProduct | null>(null);
  const [cmStatus, setCmStatus] = useState<string | null>(null);

  useEffect(() => {
    setCmPrices(null); 
    setCmStatus(null); 

    if (cardmarketPriceGuide && card.name && card.set) {
      const normalizedCardName = normalizeString(card.name);
      const normalizedCardSet = normalizeString(card.set);
      
      const foundProduct = cardmarketPriceGuide.find(cmProduct => {
        const normalizedCmName = normalizeString(cmProduct.Name);
        const normalizedCmSet = normalizeString(cmProduct.Expansion);
        
        return normalizedCmName.includes(normalizedCardName) && 
               normalizedCmSet.includes(normalizedCardSet);
      });

      if (foundProduct) {
        setCmPrices(foundProduct);
        if (!(foundProduct["Low Price"] || foundProduct["Trend Price"] || foundProduct["Average Sell Price"])) {
          setCmStatus("(CM: Matched, no price data)");
        }
      } else {
        if (cardmarketPriceGuide.length > 0) { 
            setCmStatus("(CM: No match in guide)");
        }
      }
    } else if (cardmarketPriceGuide === null) {
      setCmStatus(null); 
    } else if (cardmarketPriceGuide && cardmarketPriceGuide.length === 0){
      setCmStatus("(CM: Price guide empty)");
    }

  }, [card, cardmarketPriceGuide]);

  const hasDisplayableCmPrices = cmPrices && (typeof cmPrices["Low Price"] === 'number' || typeof cmPrices["Trend Price"] === 'number' || typeof cmPrices["Average Sell Price"] === 'number');

  return (
    <Card className="shadow-lg hover:shadow-primary/20 transition-shadow duration-300 flex flex-col bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-headline text-lg leading-tight">
          {card.name || `${card.set} #${card.cardNumber}`}
        </CardTitle>
        {card.name && <CardDescription className="text-xs">{card.set} #{card.cardNumber}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2 flex-grow pb-3">
        <div 
          className="relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden mb-2 shadow-inner cursor-pointer group"
          onClick={() => onView(cardIndex)} // Make image clickable
        >
          <Image 
            src={card.imageUrl || "https://placehold.co/250x350.png"} 
            alt={card.name || card.cardNumber} 
            width={250} 
            height={350} 
            className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-200" 
            data-ai-hint="pokemon card front"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <Eye className="h-8 w-8 text-white" />
          </div>
        </div>
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

        {hasDisplayableCmPrices && cmPrices && (
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
        {cmStatus && !hasDisplayableCmPrices && (
             <p className="text-xs text-muted-foreground italic flex items-center gap-1 mt-1">
                <Info size={12}/> {cmStatus}
            </p>
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
