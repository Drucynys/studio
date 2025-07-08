// src/components/CardList.tsx
"use client";

import type { PokemonCard } from "@/types";
import { CardItem } from "./CardItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { List, PackageOpen } from "lucide-react";
import { Button } from "./ui/button";

type CardListProps = {
  cards: PokemonCard[];
  onEditCard: (card: PokemonCard) => void;
  onRemoveCard: (cardId: string) => void;
  onViewCard: (cardIndex: number) => void;
  onToggleFavorite: (card: PokemonCard) => void;
};

export function CardList({ cards, onEditCard, onRemoveCard, onViewCard, onToggleFavorite }: CardListProps) {
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
          <div className="text-center py-8 flex flex-col items-center gap-2">
            <PackageOpen className="h-12 w-12 text-muted-foreground opacity-70"/>
            <p className="text-muted-foreground">Your collection is empty.</p>
            <p className="text-sm text-muted-foreground">Use the search or browse pages to find and add cards.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <List className="h-6 w-6 text-primary" />
          My Collection
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-[calc(100vh-28rem)] md:h-[calc(100vh-24rem)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 p-4 md:p-6">
            {cards.map((card, index) => (
              <CardItem 
                key={`${card.id}-${index}`} 
                card={card} 
                cardIndex={index}
                onEdit={() => onEditCard(card)} 
                onRemove={() => onRemoveCard(card.id)}
                onView={onViewCard}
                onToggleFavorite={() => onToggleFavorite(card)}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
