/**
 * useWishlist.ts
 *
 * Real-time hook for the authenticated user's wishlist.
 * Uses the same onSnapshot → queryClient.setQueryData pattern as useUserCollection.
 */
import { useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { wishlistService } from '@/services/wishlistService';
import { useGuestStore } from '@/store/useGuestStore';
import type { WishlistItem } from '@/types';

const EMPTY_ARRAY: WishlistItem[] = [];

export function useWishlist(uid: string | undefined) {
  const queryClient = useQueryClient();
  const isGuest = useGuestStore((s) => s.isGuest);
  const guestWishlist = useGuestStore((s) => s.wishlist);

  const key = useMemo(() => queryKeys.wishlist(uid ?? '__none__'), [uid]);

  const { data: wishlist = EMPTY_ARRAY } = useQuery<WishlistItem[]>({
    queryKey: key,
    queryFn: () => queryClient.getQueryData<WishlistItem[]>(key) ?? [],
    enabled: false,
  });

  const hasReceivedFirstSnapshot = useRef(false);

  useEffect(() => {
    if (!uid || isGuest) {
      hasReceivedFirstSnapshot.current = true;
      return;
    }

    hasReceivedFirstSnapshot.current = false;

    const unsubscribe = wishlistService.subscribe(uid, (items) => {
      queryClient.setQueryData(key, items);
      hasReceivedFirstSnapshot.current = true;
    });

    return () => {
      unsubscribe();
    };
  }, [uid, isGuest, queryClient, key]);

  useEffect(() => {
    if (isGuest && uid) {
      queryClient.setQueryData(key, guestWishlist);
    }
  }, [isGuest, uid, guestWishlist, queryClient, key]);

  return {
    wishlist: isGuest ? guestWishlist : wishlist,
    loadingWishlist: !isGuest && !!uid && !hasReceivedFirstSnapshot.current && wishlist.length === 0,
  };
}
