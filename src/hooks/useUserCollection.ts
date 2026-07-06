/**
 * useUserCollection.ts
 *
 * Real-time hook for the authenticated user's card collection.
 *
 * Pattern:
 *  - A `useQuery` entry is created so the data lives in the TanStack cache.
 *  - A `useEffect` opens an `onSnapshot` Firestore listener and pushes
 *    every snapshot into the cache via `queryClient.setQueryData`.
 *  - Guest/demo mode reads from the Zustand guest store instead.
 *  - The `queryFn` is set to `() => []` and `enabled: false` because
 *    all data arrives through the snapshot side-channel.
 */
import { useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { collectionService } from '@/services/collectionService';
import { useGuestStore } from '@/store/useGuestStore';
import type { PokemonCard } from '@/types';

const EMPTY_ARRAY: PokemonCard[] = [];

export function useUserCollection(uid: string | undefined) {
  const queryClient = useQueryClient();
  const isGuest = useGuestStore((s) => s.isGuest);
  const guestCollection = useGuestStore((s) => s.collection);

  const key = useMemo(() => queryKeys.collection(uid ?? '__none__'), [uid]);

  // The query itself never fetches — data is injected by the snapshot listener below.
  const { data: collection = EMPTY_ARRAY, isLoading } = useQuery<PokemonCard[]>({
    queryKey: key,
    queryFn: () => {
      // Return current cache or empty array — real data comes from onSnapshot.
      return queryClient.getQueryData<PokemonCard[]>(key) ?? [];
    },
    enabled: false, // Never auto-fetches; snapshot drives the cache.
  });

  // Track whether the first snapshot has arrived so we can derive a loading state.
  const hasReceivedFirstSnapshot = useRef(false);

  useEffect(() => {
    // If there's no uid or this is a guest, don't open a Firestore listener.
    if (!uid || isGuest) {
      hasReceivedFirstSnapshot.current = true;
      return;
    }

    hasReceivedFirstSnapshot.current = false;

    const unsubscribe = collectionService.subscribe(uid, (cards) => {
      queryClient.setQueryData(key, cards);
      hasReceivedFirstSnapshot.current = true;
    });

    return () => {
      unsubscribe();
    };
  }, [uid, isGuest, queryClient, key]);

  // For guest mode, inject the guest store data into the query cache.
  useEffect(() => {
    if (isGuest && uid) {
      queryClient.setQueryData(key, guestCollection);
    }
  }, [isGuest, uid, guestCollection, queryClient, key]);

  return {
    collection: isGuest ? guestCollection : collection,
    loadingCollection:
      !isGuest && !!uid && !hasReceivedFirstSnapshot.current && collection.length === 0,
  };
}
