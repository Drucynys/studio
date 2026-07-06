// src/components/CardItem.tsx
'use client';

import type { PokemonCard } from '@/types';
import Image from 'next/image';
import { Star } from 'lucide-react';
import React, { memo, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ApiPokemonCard } from '@/app/sets/[setId]/page';
import { getVariantAbbreviation } from '@/utils/cardUtils';

type CardItemProps = {
  card: PokemonCard;
  cardIndex: number;
  masterCard?: ApiPokemonCard;
  onView: (cardIndex: number) => void;
};

export const CardItem = memo(
  ({ card, cardIndex, masterCard, onView }: CardItemProps): React.JSX.Element | null => {
    if (!card) return null;

    const [isImageLoading, setIsImageLoading] = useState(true);

    const isHolo = useMemo(() => {
      const rarity = (card.rarity || '').toLowerCase();
      const variant = (card.variant || '').toLowerCase();
      return (
        rarity.includes('holo') ||
        rarity.includes('rare') ||
        rarity.includes('secret') ||
        rarity.includes('promo') ||
        rarity.includes('shiny') ||
        rarity.includes('ultra') ||
        variant.includes('holo') ||
        variant.includes('shiny')
      );
    }, [card.rarity, card.variant]);

    const variantBadge = useMemo(() => {
      const abbrev = getVariantAbbreviation(card.variant);
      if (!abbrev) return null;

      let colorClasses = '';
      if (abbrev === 'RR') {
        colorClasses = 'bg-rose-500/85 border-rose-400/40 text-white shadow-rose-500/25';
      } else if (abbrev === '1st') {
        colorClasses = 'bg-amber-500/85 border-amber-400/40 text-white shadow-amber-500/25';
      } else if (abbrev === 'H') {
        colorClasses = 'bg-indigo-500/85 border-indigo-400/40 text-white shadow-indigo-500/25';
      } else if (abbrev === 'UNL') {
        colorClasses = 'bg-slate-500/85 border-slate-400/40 text-white shadow-slate-500/25';
      } else {
        colorClasses = 'bg-teal-500/85 border-teal-400/40 text-white shadow-teal-500/25';
      }

      return (
        <span
          className={cn(
            'absolute bottom-2.5 left-2.5 z-10 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border backdrop-blur-md shadow-sm transition-all duration-300 group-hover:scale-105',
            colorClasses
          )}
        >
          {abbrev}
        </span>
      );
    }, [card.variant]);

    return (
      <div
        onClick={() => onView(cardIndex)}
        className={cn(
          'group relative aspect-[2.5/3.5] w-full cursor-pointer rounded-xl overflow-hidden border border-border/40 bg-card/45 backdrop-blur-xl shadow-md transition-all duration-300 group-hover:shadow-primary/25 hover:scale-105 hover:-translate-y-1 hover:z-10 active:scale-[0.98]',
          isImageLoading && 'animate-shimmer bg-muted/40',
          isHolo && 'list-card-holo'
        )}
      >
        <Image
          src={card.imageUrl || 'https://placehold.co/250x350.png'}
          alt={card.name || card.cardNumber}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
          className={cn(
            'object-contain w-full h-full transition-all duration-500',
            isImageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          )}
          onLoad={() => setIsImageLoading(false)}
          data-ai-hint="pokemon card front"
        />
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Quantity badge */}
        {card.quantity > 1 && (
          <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/75 text-white shadow-sm backdrop-blur-sm">
            x{card.quantity}
          </span>
        )}

        {/* Favorite indicator */}
        {card.isFavorite && (
          <span className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-amber-500 text-white shadow-sm">
            <Star className="h-3 w-3 fill-current" />
          </span>
        )}

        {/* Variant badge */}
        {variantBadge}

        {/* Card number badge */}
        <span className="absolute bottom-2.5 right-2.5 z-10 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-black/60 text-white transition-opacity group-hover:opacity-0">
          #{card.cardNumber}
        </span>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.card.id === nextProps.card.id &&
      prevProps.card.isFavorite === nextProps.card.isFavorite &&
      prevProps.card.quantity === nextProps.card.quantity &&
      prevProps.card.imageUrl === nextProps.card.imageUrl &&
      prevProps.card.variant === nextProps.card.variant &&
      prevProps.masterCard?.tcgplayer?.prices === nextProps.masterCard?.tcgplayer?.prices
    );
  }
);

CardItem.displayName = 'CardItem';
