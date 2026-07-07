// src/hooks/useMyCollectionState.ts
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { PokemonCard, WishlistItem, ExchangeItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserCollection } from '@/hooks/useUserCollection';
import { useWishlist } from '@/hooks/useWishlist';
import { useExchange } from '@/hooks/useExchange';
import { collectionService } from '@/services/collectionService';
import { wishlistService } from '@/services/wishlistService';
import { exchangeService } from '@/services/exchangeService';
import { useUIStore } from '@/store/useUIStore';
import { useDebounce } from '@/hooks/useDebounce';
import type { ApiPokemonCard } from '@/app/sets/[setId]/page';

const getMarketPrice = (apiCard: ApiPokemonCard | undefined, variant?: string | null): number => {
  if (!apiCard || !apiCard.tcgplayer?.prices) return 0;
  const prices = apiCard.tcgplayer.prices;

  if (variant && prices[variant]?.market) {
    return prices[variant].market;
  }
  const variantPriority = [
    'normal',
    'holofoil',
    'reverseHolofoil',
    '1stEditionNormal',
    '1stEditionHolofoil',
    'unlimitedHolofoil',
    'unlimitedNormal',
  ];
  for (const v of variantPriority) {
    if (prices[v]?.market) {
      return prices[v].market;
    }
  }
  return 0;
};

export interface CollectionStats {
  totalValueAdded: number;
  totalCurrentValue: number;
  totalCards: number;
  uniqueCards: number;
}

export function useMyCollectionState() {
  const { openAuthModal } = useUIStore();
  const { user, loading } = useAuth();
  const { collection, loadingCollection } = useUserCollection(user?.uid);
  const { wishlist, loadingWishlist } = useWishlist(user?.uid);
  const { myExchangeItems, loadingMyExchangeItems } = useExchange(user?.uid);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('dateAddedDesc');
  const [cardToEdit, setCardToEdit] = useState<PokemonCard | null>(null);
  const [cardToDelete, setCardToDelete] = useState<PokemonCard | null>(null);
  const [itemToDeleteFromWishlist, setItemToDeleteFromWishlist] = useState<WishlistItem | null>(
    null
  );
  const [itemToDeleteFromExchange, setItemToDeleteFromExchange] = useState<ExchangeItem | null>(
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isFullScreenViewOpen, setIsFullScreenViewOpen] = useState(false);
  const [currentFullScreenCardIndex, setCurrentFullScreenCardIndex] = useState<number | null>(null);

  const [masterCardData, setMasterCardData] = useState<Map<string, ApiPokemonCard>>(new Map());
  const [loadingMasterData, setLoadingMasterData] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const updateCardInCollection = useCallback(
    async (card: PokemonCard): Promise<void> => {
      if (!user) return;
      try {
        await collectionService.updateCard(user.uid, card);
      } catch (error) {
        console.error('Error updating card:', error);
        toast({
          title: 'Error',
          description: 'Failed to update card in collection.',
          variant: 'destructive',
        });
      }
    },
    [user, toast]
  );

  const removeCardFromCollection = useCallback(
    async (cardId: string): Promise<void> => {
      if (!user) return;
      try {
        await collectionService.removeCard(user.uid, cardId);
      } catch (error) {
        console.error('Error removing card:', error);
        toast({
          title: 'Error',
          description: 'Failed to remove card from collection.',
          variant: 'destructive',
        });
      }
    },
    [user, toast]
  );

  const removeCardFromWishlist = useCallback(
    async (itemId: string): Promise<void> => {
      if (!user) return;
      try {
        await wishlistService.removeItem(user.uid, itemId);
        toast({ title: 'Removed', description: 'Item removed from wishlist.' });
      } catch (error) {
        console.error('Error removing from wishlist:', error);
        toast({
          title: 'Error',
          description: 'Failed to remove from wishlist.',
          variant: 'destructive',
        });
      }
    },
    [user, toast]
  );

  const moveCardFromWishlistToCollection = useCallback(
    async (item: WishlistItem): Promise<void> => {
      if (!user) return;
      try {
        await wishlistService.removeItem(user.uid, item.id);
        await collectionService.addCard(user.uid, {
          apiId: item.apiId,
          name: item.name,
          set: item.set,
          cardNumber: item.cardNumber,
          rarity: item.rarity || 'N/A',
          imageUrl: item.imageUrl || null,
          artist: item.artist || null,
          language: 'English',
          quantity: 1,
          value: 0,
          variant: null,
        });
        toast({
          title: 'Moved to Collection',
          description: `${item.name} moved to your collection.`,
        });
      } catch (error) {
        console.error('Error moving card:', error);
        toast({
          title: 'Error',
          description: 'Failed to move card to collection.',
          variant: 'destructive',
        });
      }
    },
    [user, toast]
  );

  const addCardToExchange = useCallback(
    async (card: PokemonCard): Promise<void> => {
      if (!user) return;
      try {
        await exchangeService.addItem(user.uid, user.displayName || 'Anonymous', user.email, card);
        toast({ title: 'Added to Exchange', description: `${card.name} is now listed for trade.` });
      } catch (error) {
        console.error('Error adding to exchange:', error);
        toast({
          title: 'Error',
          description: 'Failed to list card for trade.',
          variant: 'destructive',
        });
      }
    },
    [user, toast]
  );

  const removeCardFromExchange = useCallback(
    async (exchangeId: string): Promise<void> => {
      try {
        await exchangeService.removeItem(exchangeId);
        toast({ title: 'Removed from Exchange', description: 'Card listing removed.' });
      } catch (error) {
        console.error('Error removing from exchange:', error);
        toast({
          title: 'Error',
          description: 'Failed to remove card listing.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const fetchMasterData = useCallback(async (): Promise<void> => {
    const allApiIds = [
      ...new Set(
        [
          ...collection.map((c) => c.apiId),
          ...wishlist.map((w) => w.apiId),
          ...myExchangeItems.map((e) => e.apiId),
        ].filter(Boolean)
      ),
    ];

    if (allApiIds.length === 0) {
      setMasterCardData(new Map());
      return;
    }

    setLoadingMasterData(true);
    try {
      const CHUNK_SIZE = 100;
      const dataMap = new Map<string, ApiPokemonCard>();

      for (let i = 0; i < allApiIds.length; i += CHUNK_SIZE) {
        const chunk = allApiIds.slice(i, i + CHUNK_SIZE);
        const response = await fetch('/api/master-cards-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: chunk }),
        });

        if (response.ok) {
          const fetchedCards: ApiPokemonCard[] = await response.json();
          fetchedCards.forEach((card) => dataMap.set(card.id, card));
        }
      }

      setMasterCardData(dataMap);
    } catch (error) {
      console.error('Error fetching master card data:', error);
    } finally {
      setLoadingMasterData(false);
    }
  }, [collection, wishlist, myExchangeItems]);

  useEffect(() => {
    if (!loadingCollection && !loadingWishlist && !loadingMyExchangeItems && user) {
      fetchMasterData();
    }
  }, [user?.uid, loadingCollection, loadingWishlist, loadingMyExchangeItems, fetchMasterData]);

  const collectionStats = useMemo<CollectionStats>(() => {
    if (!collection || collection.length === 0) {
      return { totalValueAdded: 0, totalCurrentValue: 0, totalCards: 0, uniqueCards: 0 };
    }

    let totalCurrentValue = 0;
    const totalValueAdded = collection.reduce((acc, card) => {
      const value = card.value || 0;
      const quantity = card.quantity || 1;
      const masterCard = masterCardData.get(card.apiId);
      const currentValue = getMarketPrice(masterCard, card.variant);
      totalCurrentValue += (currentValue > 0 ? currentValue : value) * quantity;
      return acc + value * quantity;
    }, 0);

    const totalCards = collection.reduce((acc, card) => acc + (card.quantity || 1), 0);
    return { totalValueAdded, totalCurrentValue, totalCards, uniqueCards: collection.length };
  }, [collection, masterCardData]);

  const sortedCards = useMemo<PokemonCard[]>(() => {
    const filtered = collection.filter((item) => {
      if (!debouncedSearchTerm) return true;
      const lower = debouncedSearchTerm.toLowerCase();
      return (
        item.name?.toLowerCase().includes(lower) ||
        item.set?.toLowerCase().includes(lower) ||
        item.cardNumber?.toLowerCase().includes(lower)
      );
    });

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'favorites':
          return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
        case 'nameAsc':
          return (a.name || '').localeCompare(b.name || '');
        case 'nameDesc':
          return (b.name || '').localeCompare(a.name || '');
        case 'valueDesc':
          const aV = getMarketPrice(masterCardData.get(a.apiId), a.variant) || a.value || 0;
          const bV = getMarketPrice(masterCardData.get(b.apiId), b.variant) || b.value || 0;
          return bV - aV;
        default:
          return 0;
      }
    });
  }, [collection, debouncedSearchTerm, sortOption, masterCardData]);

  const filteredWishlist = useMemo<WishlistItem[]>(
    () =>
      wishlist.filter((item) => {
        if (!debouncedSearchTerm) return true;
        const lower = debouncedSearchTerm.toLowerCase();
        return item.name?.toLowerCase().includes(lower) || item.set?.toLowerCase().includes(lower);
      }),
    [wishlist, debouncedSearchTerm]
  );

  const filteredExchangeItems = useMemo<ExchangeItem[]>(
    () =>
      myExchangeItems.filter((item) => {
        if (!debouncedSearchTerm) return true;
        const lower = debouncedSearchTerm.toLowerCase();
        return item.name?.toLowerCase().includes(lower) || item.set?.toLowerCase().includes(lower);
      }),
    [myExchangeItems, debouncedSearchTerm]
  );

  return {
    user,
    loading,
    collection,
    loadingCollection,
    wishlist,
    loadingWishlist,
    myExchangeItems,
    loadingMyExchangeItems,
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    cardToEdit,
    setCardToEdit,
    cardToDelete,
    setCardToDelete,
    itemToDeleteFromWishlist,
    setItemToDeleteFromWishlist,
    itemToDeleteFromExchange,
    setItemToDeleteFromExchange,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isFullScreenViewOpen,
    setIsFullScreenViewOpen,
    currentFullScreenCardIndex,
    setCurrentFullScreenCardIndex,
    masterCardData,
    loadingMasterData,
    collectionStats,
    sortedCards,
    filteredWishlist,
    filteredExchangeItems,
    updateCardInCollection,
    removeCardFromCollection,
    removeCardFromWishlist,
    moveCardFromWishlistToCollection,
    addCardToExchange,
    removeCardFromExchange,
    openAuthModal,
  };
}
