// src/components/BulkAddDialog.tsx
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Minus, Check, Layers } from 'lucide-react';
import type { ApiPokemonCard } from '@/app/sets/[setId]/page';
import { getCardVariants, formatVariantKey } from '@/utils/cardUtils';
import type { BulkQuantities } from '@/hooks/useBulkAdd';
import { cn } from '@/lib/utils';

// Helper to format variant name cleanly
const formatName = (key: string): string => {
  if (!key) return 'Standard';
  return formatVariantKey(key);
};

interface BulkAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCards: ApiPokemonCard[];
  quantities: BulkQuantities;
  isAdding: boolean;
  onIncrement: (cardId: string, variant: string) => void;
  onDecrement: (cardId: string, variant: string) => void;
  onQuantityChange: (cardId: string, variant: string, value: number) => void;
  onSubmit: () => void;
}

export function BulkAddDialog({
  isOpen,
  onClose,
  selectedCards,
  quantities,
  isAdding,
  onIncrement,
  onDecrement,
  onQuantityChange,
  onSubmit,
}: BulkAddDialogProps): React.JSX.Element {
  // Compute total selected items across all cards and variants
  const totalCount = useMemo((): number => {
    let total = 0;
    selectedCards.forEach((card) => {
      const variants = getCardVariants(card);
      variants.forEach((v) => {
        total += quantities[`${card.id}:${v}`] ?? 0;
      });
    });
    return total;
  }, [selectedCards, quantities]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isAdding) onClose(); }}>
      <DialogContent className="w-full h-full max-w-full max-h-screen border-none rounded-none bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl backdrop-saturate-200 p-4 sm:p-6 sm:max-w-[620px] sm:h-[80vh] sm:max-h-[720px] sm:border border-white/40 dark:border-white/15 sm:rounded-2xl flex flex-col justify-between overflow-hidden select-none shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),inset_0_1px_1px_0_rgba(255,255,255,0.45)] transition-all duration-300">
        
        <DialogHeader className="space-y-1.5 flex flex-col items-center justify-center text-center flex-shrink-0">
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl font-black w-full text-center">
            <Layers className="h-6 w-6 text-primary" />
            <span>Bulk Add Cards</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-semibold text-sm text-center">
            Configure quantities and variants for the {selectedCards.length} selected card(s).
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-2 bg-border/40" />

        {/* Scrollable list of cards with variant quantities */}
        <ScrollArea className="flex-1 w-full my-2 pr-1">
          <div className="space-y-6 py-2 px-1">
            {selectedCards.map((card) => {
              const variants = getCardVariants(card);

              return (
                <div
                  key={card.id}
                  className="flex flex-col sm:flex-row gap-4 p-3 rounded-xl bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/5 backdrop-blur-md shadow-sm"
                >
                  {/* Left: Card Preview container with relative positioning and aspect ratio */}
                  <div className="flex-shrink-0 flex items-center justify-center sm:justify-start">
                    <div className="relative aspect-[63/88] w-20 rounded-lg overflow-hidden shadow-md border border-border/30 bg-muted/20 hover:scale-105 transition-transform duration-200">
                      <Image
                        src={card.images.small || card.images.large || 'https://placehold.co/200x280.png'}
                        alt={card.name}
                        fill
                        sizes="80px"
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </div>

                  {/* Right: Card metadata & variants selection */}
                  <div className="flex-grow flex flex-col justify-center min-w-0">
                    <div className="mb-2">
                      <h4 className="font-extrabold text-base text-foreground truncate">
                        {card.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        #{card.number} &bull; {card.rarity || 'N/A'}
                      </p>
                    </div>

                    {/* List of variants and quantity selectors */}
                    <div className="space-y-2">
                      {variants.map((v) => {
                        const qty = quantities[`${card.id}:${v}`] ?? 0;
                        
                        // Extract market price info
                        const marketPrices = card.tcgplayer?.prices;
                        const priceEntry = marketPrices
                          ? marketPrices[v as keyof typeof marketPrices]
                          : null;
                        const priceDisplay = priceEntry?.market
                          ? ` ($${priceEntry.market.toFixed(2)})`
                          : '';

                        return (
                          <div
                            key={v}
                            className="flex items-center justify-between text-sm py-1 border-t border-border/20 first:border-0"
                          >
                            <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate mr-2">
                              {formatName(v)}
                              <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                                {priceDisplay}
                              </span>
                            </span>

                            <div className="flex items-center gap-2 select-none flex-shrink-0">
                              {/* Minus Button */}
                              <button
                                type="button"
                                onClick={() => onDecrement(card.id, v)}
                                disabled={qty <= 0 || isAdding}
                                className="w-7 h-7 rounded-full bg-white/40 dark:bg-white/5 text-zinc-750 dark:text-zinc-200 flex items-center justify-center hover:bg-white/60 dark:hover:bg-white/10 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none border border-white/40 dark:border-zinc-700/30 shadow-sm font-bold text-xs backdrop-blur-sm"
                              >
                                <Minus className="h-3 w-3" />
                              </button>

                              {/* Number Display */}
                              <span
                                className={cn(
                                  'text-sm font-black min-w-[20px] text-center',
                                  qty > 0 ? 'text-primary' : 'text-muted-foreground'
                                )}
                              >
                                {qty}
                              </span>

                              {/* Plus Button */}
                              <button
                                type="button"
                                onClick={() => onIncrement(card.id, v)}
                                disabled={isAdding}
                                className="w-7 h-7 rounded-full bg-white/60 dark:bg-white/15 text-zinc-900 dark:text-zinc-100 flex items-center justify-center hover:bg-white/80 dark:hover:bg-white/25 active:scale-90 transition-all border border-white/50 dark:border-zinc-650/40 shadow-sm font-bold text-xs backdrop-blur-sm"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator className="my-2 bg-border/40" />

        {/* Dialog footer with submit button */}
        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 mt-auto w-full">
          <Button
            variant="outline"
            disabled={isAdding}
            onClick={onClose}
            className="flex-1 rounded-xl h-11 bg-white/40 hover:bg-white/60 dark:bg-zinc-800/10 dark:hover:bg-zinc-800/20 border-white/50 dark:border-white/10 backdrop-blur-sm shadow-sm transition-all duration-200"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isAdding}
            className="flex-1 rounded-xl h-11 flex items-center justify-center gap-1.5 font-bold transition-all duration-200 active:scale-95 shadow-md border border-white/20 backdrop-blur-sm bg-blue-600/80 hover:bg-blue-600 dark:bg-blue-500/70 dark:hover:bg-blue-500/85 text-white"
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Save Changes ({totalCount} in Card Selection)</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
