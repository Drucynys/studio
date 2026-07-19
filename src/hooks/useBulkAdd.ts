// src/hooks/useBulkAdd.ts
import { useState, useCallback } from 'react';
import type { ApiPokemonCard } from '@/app/sets/[setId]/page';
import { collectionService } from '@/services/collectionService';
import { useToast } from '@/hooks/use-toast';
import { getCardVariants, getDefaultVariant } from '@/utils/cardUtils';
import type { PokemonCard } from '@/types';

export type BulkQuantities = Record<string, number>;

export interface UseBulkAddResult {
  isBulkMode: boolean;
  selectedCards: ApiPokemonCard[];
  isDialogOpen: boolean;
  isAdding: boolean;
  quantities: BulkQuantities;
  toggleBulkMode: () => void;
  toggleCardSelection: (card: ApiPokemonCard) => void;
  isSelected: (cardId: string) => boolean;
  clearSelection: () => void;
  selectAllCards: (cards: ApiPokemonCard[]) => void;
  openBulkDialog: () => void;
  closeBulkDialog: () => void;
  setQuantity: (cardId: string, variant: string, value: number) => void;
  incrementQuantity: (cardId: string, variant: string) => void;
  decrementQuantity: (cardId: string, variant: string) => void;
  submitBulkAdd: (uid: string) => Promise<boolean>;
}

export function useBulkAdd(collection: PokemonCard[] = []): UseBulkAddResult {
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [selectedCards, setSelectedCards] = useState<ApiPokemonCard[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [quantities, setQuantities] = useState<BulkQuantities>({});
  const { toast } = useToast();

  const toggleBulkMode = useCallback((): void => {
    setIsBulkMode((prev) => {
      const next = !prev;
      if (!next) {
        // Reset state when leaving bulk mode
        setSelectedCards([]);
        setQuantities({});
      }
      return next;
    });
  }, []);

  const toggleCardSelection = useCallback((card: ApiPokemonCard): void => {
    setSelectedCards((prev) => {
      const exists = prev.some((c) => c.id === card.id);
      if (exists) {
        const updatedCards = prev.filter((c) => c.id !== card.id);
        // Remove quantities for this card
        setQuantities((prevQuantities) => {
          const updatedQuantities = { ...prevQuantities };
          Object.keys(updatedQuantities).forEach((key) => {
            if (key.startsWith(`${card.id}:`)) {
              delete updatedQuantities[key];
            }
          });
          return updatedQuantities;
        });
        return updatedCards;
      } else {
        const variants = getCardVariants(card);
        
        // Find existing quantities in user's collection for this card
        const cardItems = collection.filter((c) => c.apiId === card.id);

        setQuantities((prevQuantities) => {
          const updatedQuantities = { ...prevQuantities };
          variants.forEach((v) => {
            const existingItem = cardItems.find((c) => c.variant === (v || null));
            updatedQuantities[`${card.id}:${v}`] = existingItem ? existingItem.quantity : 0;
          });
          return updatedQuantities;
        });
        return [...prev, card];
      }
    });
  }, [collection]);

  const isSelected = useCallback(
    (cardId: string): boolean => {
      return selectedCards.some((c) => c.id === cardId);
    },
    [selectedCards]
  );

  const clearSelection = useCallback((): void => {
    setSelectedCards([]);
    setQuantities({});
  }, []);

  const selectAllCards = useCallback((cards: ApiPokemonCard[]): void => {
    setSelectedCards(cards);
    setQuantities((prev) => {
      const updated = { ...prev };
      cards.forEach((card) => {
        const variants = getCardVariants(card);
        const cardItems = collection.filter((c) => c.apiId === card.id);

        variants.forEach((v) => {
          const existingItem = cardItems.find((c) => c.variant === (v || null));
          updated[`${card.id}:${v}`] = existingItem ? existingItem.quantity : 0;
        });
      });
      return updated;
    });
  }, [collection]);

  const openBulkDialog = useCallback((): void => {
    if (selectedCards.length === 0) {
      toast({
        title: 'No cards selected',
        description: 'Please select at least one card to add.',
        variant: 'destructive',
      });
      return;
    }
    setIsDialogOpen(true);
  }, [selectedCards, toast]);

  const closeBulkDialog = useCallback((): void => {
    setIsDialogOpen(false);
  }, []);

  const setQuantity = useCallback((cardId: string, variant: string, value: number): void => {
    setQuantities((prev) => ({
      ...prev,
      [`${cardId}:${variant}`]: Math.max(0, value),
    }));
  }, []);

  const incrementQuantity = useCallback((cardId: string, variant: string): void => {
    setQuantities((prev) => {
      const key = `${cardId}:${variant}`;
      const current = prev[key] ?? 0;
      return {
        ...prev,
        [key]: current + 1,
      };
    });
  }, []);

  const decrementQuantity = useCallback((cardId: string, variant: string): void => {
    setQuantities((prev) => {
      const key = `${cardId}:${variant}`;
      const current = prev[key] ?? 0;
      return {
        ...prev,
        [key]: Math.max(0, current - 1),
      };
    });
  }, []);

  const submitBulkAdd = useCallback(
    async (uid: string): Promise<boolean> => {
      if (!uid) {
        toast({
          title: 'Authentication required',
          description: 'You must be signed in to add cards to your collection.',
          variant: 'destructive',
        });
        return false;
      }

      setIsAdding(true);
      try {
        let addedCount = 0;
        let updatedCount = 0;
        let removedCount = 0;

        // Process each card
        for (const card of selectedCards) {
          const variants = getCardVariants(card);
          for (const variant of variants) {
            const qty = quantities[`${card.id}:${variant}`] ?? 0;
            const existingItem = collection.find(
              (c) => c.apiId === card.id && c.variant === (variant || null)
            );
            const dbQty = existingItem ? existingItem.quantity : 0;

            if (qty === dbQty) continue;

            if (qty === 0) {
              if (existingItem) {
                await collectionService.removeCard(uid, existingItem.id);
                removedCount++;
              }
            } else {
              if (existingItem) {
                await collectionService.updateCard(uid, {
                  ...existingItem,
                  quantity: qty,
                });
                updatedCount++;
              } else {
                const marketPrices = card.tcgplayer?.prices;
                const priceEntry = marketPrices
                  ? marketPrices[variant as keyof typeof marketPrices]
                  : null;
                const price = priceEntry?.market ?? 0;

                await collectionService.addCard(uid, {
                  apiId: card.id,
                  name: card.name,
                  set: card.set?.name || 'Unknown Set',
                  cardNumber: card.localId || card.number || 'N/A',
                  rarity: card.rarity || 'N/A',
                  value: price,
                  variant: variant || null,
                  quantity: qty,
                  imageUrl: card.images?.large || card.images?.small || null,
                  language: 'English',
                  artist: card.artist || null,
                });
                addedCount++;
              }
            }
          }
        }

        const details = [];
        if (addedCount > 0) details.push(`added ${addedCount}`);
        if (updatedCount > 0) details.push(`updated ${updatedCount}`);
        if (removedCount > 0) details.push(`removed ${removedCount}`);

        toast({
          title: 'Collection updated!',
          description: details.length > 0
            ? `Successfully ${details.join(', ')} variants.`
            : 'No changes were made to your collection.',
        });

        // Reset state after successful submit
        setSelectedCards([]);
        setQuantities({});
        setIsBulkMode(false);
        setIsDialogOpen(false);
        return true;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast({
          title: 'Failed to update cards',
          description: `An error occurred: ${errorMessage}`,
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsAdding(false);
      }
    },
    [selectedCards, quantities, collection, toast]
  );

  return {
    isBulkMode,
    selectedCards,
    isDialogOpen,
    isAdding,
    quantities,
    toggleBulkMode,
    toggleCardSelection,
    isSelected,
    clearSelection,
    selectAllCards,
    openBulkDialog,
    closeBulkDialog,
    setQuantity,
    incrementQuantity,
    decrementQuantity,
    submitBulkAdd,
  };
}
