/**
 * useNotifications.ts
 *
 * Real-time hooks for the authenticated user's notifications and following list.
 * Uses the same onSnapshot → queryClient.setQueryData pattern as useUserCollection.
 */
import { useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { notificationService, followingService } from '@/services/notificationService';
import { useGuestStore } from '@/store/useGuestStore';
import type { Notification } from '@/context/AuthContext';

const EMPTY_NOTIFICATIONS: Notification[] = [];

export function useNotifications(uid: string | undefined) {
  const queryClient = useQueryClient();
  const isGuest = useGuestStore((s) => s.isGuest);
  const guestNotifications = useGuestStore((s) => s.notifications);

  const key = useMemo(() => queryKeys.notifications(uid ?? '__none__'), [uid]);

  const { data: notifications = EMPTY_NOTIFICATIONS } = useQuery<Notification[]>({
    queryKey: key,
    queryFn: () => queryClient.getQueryData<Notification[]>(key) ?? [],
    enabled: false,
  });

  const hasReceivedFirstSnapshot = useRef(false);

  useEffect(() => {
    if (!uid || isGuest) {
      hasReceivedFirstSnapshot.current = true;
      return;
    }

    hasReceivedFirstSnapshot.current = false;

    const unsubscribe = notificationService.subscribe(uid, (items) => {
      queryClient.setQueryData(key, items);
      hasReceivedFirstSnapshot.current = true;
    });

    return () => {
      unsubscribe();
    };
  }, [uid, isGuest, queryClient, key]);

  useEffect(() => {
    if (isGuest && uid) {
      queryClient.setQueryData(key, guestNotifications);
    }
  }, [isGuest, uid, guestNotifications, queryClient, key]);

  return {
    notifications: isGuest ? guestNotifications : notifications,
    loadingNotifications: !isGuest && !!uid && !hasReceivedFirstSnapshot.current && notifications.length === 0,
  };
}

const EMPTY_FOLLOWING: string[] = [];

export function useFollowing(uid: string | undefined) {
  const queryClient = useQueryClient();
  const isGuest = useGuestStore((s) => s.isGuest);
  const guestFollowing = useGuestStore((s) => s.following);

  const key = useMemo(() => queryKeys.following(uid ?? '__none__'), [uid]);

  const { data: following = EMPTY_FOLLOWING } = useQuery<string[]>({
    queryKey: key,
    queryFn: () => queryClient.getQueryData<string[]>(key) ?? [],
    enabled: false,
  });

  const hasReceivedFirstSnapshot = useRef(false);

  useEffect(() => {
    if (!uid || isGuest) {
      hasReceivedFirstSnapshot.current = true;
      return;
    }

    hasReceivedFirstSnapshot.current = false;

    const unsubscribe = followingService.subscribe(uid, (uids) => {
      queryClient.setQueryData(key, uids);
      hasReceivedFirstSnapshot.current = true;
    });

    return () => {
      unsubscribe();
    };
  }, [uid, isGuest, queryClient, key]);

  useEffect(() => {
    if (isGuest && uid) {
      queryClient.setQueryData(key, guestFollowing);
    }
  }, [isGuest, uid, guestFollowing, queryClient, key]);

  return {
    following: isGuest ? guestFollowing : following,
    loadingFollowing: !isGuest && !!uid && !hasReceivedFirstSnapshot.current && following.length === 0,
  };
}
