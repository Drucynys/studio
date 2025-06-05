"use client";

import type { PokemonCard } from "@/types";
import { CardItem } from "./CardItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { List } from "lucide-react";

type CardListProps = {
  cards: PokemonCard[];
};

export function CardList({ cards }: CardListProps) {
  if (cards.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
             <List className="h-6 w-6 text-accent" />
            My Collection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Your collection is empty. Add some cards!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <List className="h-6 w-6 text-accent" />
          My Collection ({cards.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-[600px] p-6"> {/* Adjust height as needed */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {cards.map((card) => (
              <CardItem key={card.id} card={card} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
