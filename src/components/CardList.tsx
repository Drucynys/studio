
"use client";

import type { PokemonCard, CardmarketPriceGuide } from "@/types";
import { CardItem } from "./CardItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { List, PackageOpen } from "lucide-react";

type CardListProps = {
  cards: PokemonCard[];
  onEditCard: (card: PokemonCard) => void;
  onRemoveCard: (cardId: string) => void;
  cardmarketPriceGuide: CardmarketPriceGuide | null;
};

export function CardList({ cards, onEditCard, onRemoveCard, cardmarketPriceGuide }: CardListProps) {
  if (cards.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
             <List className="h-6 w-6 text-primary" />
            My Collection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
            <PackageOpen className="h-12 w-12 text-muted-foreground opacity-70"/>
            Your collection is currently empty. 
            <a href="/add-card" className="text-primary hover:underline">Add some cards</a> to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <List className="h-6 w-6 text-primary" />
          My Collection ({cards.reduce((acc, card) => acc + card.quantity, 0)} Cards, {cards.length} Unique)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        {/* Adjusted height: consider new filter section heights and potential cm loading text */}
        <ScrollArea className="h-[calc(100vh-28rem)] md:h-[calc(100vh-24rem)] p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {cards.map((card) => (
              <CardItem 
                key={card.id} 
                card={card} 
                onEdit={() => onEditCard(card)} 
                onRemove={() => onRemoveCard(card.id)}
                cardmarketPriceGuide={cardmarketPriceGuide}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
