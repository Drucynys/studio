// src/components/CardList.tsx
'use client';

import type { PokemonCard } from '@/types';
import { CardItem } from './CardItem';
import { PackageOpen, Loader2 } from 'lucide-react';
import type { ApiPokemonCard } from '@/app/sets/[setId]/page';

type CardListProps = {
  cards: PokemonCard[];
  masterCardData: Map<string, ApiPokemonCard>;
  onViewCard: (cardIndex: number) => void;
  isLoadingMasterData: boolean;
};

export function CardList({
  cards,
  masterCardData,
  onViewCard,
  isLoadingMasterData,
}: CardListProps): React.JSX.Element {
  if (cards.length === 0) {
    return (
      <div className="bg-card/45 backdrop-blur-xl border border-border/40 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-5 shadow-xl">
        <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <PackageOpen size={24} />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">Your Vault is Empty</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Use the search or browse pages to find and catalog cards.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isLoadingMasterData && (
        <div className="flex items-center justify-end text-xs text-muted-foreground animate-pulse pr-2">
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-primary" />
          <span>Syncing latest market valuations...</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pt-4">
        {cards.map((card, index) => (
          <CardItem
            key={`${card.id}-${index}`}
            card={card}
            cardIndex={index}
            masterCard={masterCardData.get(card.apiId)}
            onView={onViewCard}
          />
        ))}
      </div>
    </div>
  );
}
