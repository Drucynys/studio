/**
 * notificationService.ts
 * Repository wrapping Firestore operations for users/{uid}/notifications
 * and users/{uid}/following.
 */
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  getFirestore,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useGuestStore } from '@/store/useGuestStore';
import type { Notification } from '@/context/AuthContext';

const db = getFirestore(app);

export const notificationService = {
  /**
   * Subscribe to real-time updates on a user's notifications.
   * Returns an unsubscribe function.
   */
  subscribe(uid: string, onData: (notifications: Notification[]) => void): () => void {
    const q = query(
      collection(db, 'users', uid, 'notifications'),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
      onData(all.filter((n) => !n.read));
    });
  },

  /** Mark a batch of notifications as read. */
  async markAsRead(uid: string, notifications: Notification[]): Promise<void> {
    if (uid === 'demo-guest-uid' || useGuestStore.getState().isGuest) {
      useGuestStore.getState().markNotificationsAsRead(notifications.map(n => n.id));
      return;
    }
    if (!uid) throw new Error('uid is required');
    if (!notifications || notifications.length === 0) return;

    const batch = writeBatch(db);
    notifications.forEach((n) => {
      if (!n.id) throw new Error('notification.id is required');
      batch.update(doc(db, 'users', uid, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  },
};

export const followingService = {
  /**
   * Subscribe to real-time updates on a user's following list.
   * Returns an unsubscribe function.
   */
  subscribe(uid: string, onData: (followingUids: string[]) => void): () => void {
    return onSnapshot(collection(db, 'users', uid, 'following'), (snap) => {
      onData(snap.docs.map((d) => d.id));
    });
  },
};
