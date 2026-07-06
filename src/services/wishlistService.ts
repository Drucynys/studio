/**
 * wishlistService.ts
 * Repository wrapping Firestore operations for users/{uid}/wishlist
 */
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getFirestore,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useGuestStore } from '@/store/useGuestStore';
import type { WishlistItem } from '@/types';

const db = getFirestore(app);

export const wishlistService = {
  /**
   * Subscribe to real-time updates on a user's wishlist.
   * Returns an unsubscribe function.
   */
  subscribe(uid: string, onData: (items: WishlistItem[]) => void): () => void {
    const q = query(
      collection(db, 'users', uid, 'wishlist'),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map((d) => d.data() as WishlistItem));
    });
  },

  /** Add an item to the user's wishlist. */
  async addItem(
    uid: string,
    item: Omit<WishlistItem, 'id' | 'userId' | 'timestamp'>
  ): Promise<string> {
    if (uid === 'demo-guest-uid' || useGuestStore.getState().isGuest) {
      const added = useGuestStore.getState().addWishlistItem(item);
      return added.id;
    }
    if (!uid) throw new Error('uid is required');
    if (!item.name || typeof item.name !== 'string') {
      throw new Error('item.name is required and must be a string');
    }
    if (!item.apiId || typeof item.apiId !== 'string') {
      throw new Error('item.apiId is required and must be a string');
    }

    const ref = collection(db, 'users', uid, 'wishlist');
    const newRef = doc(ref);
    await setDoc(newRef, {
      ...item,
      id: newRef.id,
      userId: uid,
      timestamp: serverTimestamp(),
    });
    return newRef.id;
  },

  /** Remove an item from the user's wishlist. */
  async removeItem(uid: string, itemId: string): Promise<void> {
    if (uid === 'demo-guest-uid' || useGuestStore.getState().isGuest) {
      useGuestStore.getState().removeWishlistItem(itemId);
      return;
    }
    if (!uid) throw new Error('uid is required');
    if (!itemId) throw new Error('itemId is required');

    await deleteDoc(doc(db, 'users', uid, 'wishlist', itemId));
  },
};
