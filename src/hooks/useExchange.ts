/**
 * useExchange.ts
 *
 * Real-time hook for the authenticated user's exchange listings.
 * Uses the same onSnapshot → queryClient.setQueryData pattern as useUserCollection.
 */
import { useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { exchangeService } from '@/services/exchangeService';
import { useGuestStore } from '@/store/useGuestStore';
import type { ExchangeItem } from '@/types';

const EMPTY_ARRAY: ExchangeItem[] = [];

export function useExchange(uid: string | undefined) {
  const queryClient = useQueryClient();
  const isGuest = useGuestStore((s) => s.isGuest);
  const guestExchangeItems = useGuestStore((s) => s.exchangeItems);

  const key = useMemo(() => queryKeys.exchange(), []);

  const { data: myExchangeItems = EMPTY_ARRAY } = useQuery<ExchangeItem[]>({
    queryKey: key,
    queryFn: () => queryClient.getQueryData<ExchangeItem[]>(key) ?? [],
    enabled: false,
  });

  const hasReceivedFirstSnapshot = useRef(false);

  useEffect(() => {
    if (!uid || isGuest) {
      hasReceivedFirstSnapshot.current = true;
      return;
    }

    hasReceivedFirstSnapshot.current = false;

    const unsubscribe = exchangeService.subscribeMyItems(uid, (items) => {
      queryClient.setQueryData(key, items);
      hasReceivedFirstSnapshot.current = true;
    });

    return () => {
      unsubscribe();
    };
  }, [uid, isGuest, queryClient, key]);

  useEffect(() => {
    if (isGuest && uid) {
      queryClient.setQueryData(key, guestExchangeItems);
    }
  }, [isGuest, uid, guestExchangeItems, queryClient, key]);

  return {
    myExchangeItems: isGuest ? guestExchangeItems : myExchangeItems,
    loadingMyExchangeItems: !isGuest && !!uid && !hasReceivedFirstSnapshot.current && myExchangeItems.length === 0,
  };
}
