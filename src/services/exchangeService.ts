/**
 * exchangeService.ts
 * Repository wrapping Firestore operations for the top-level exchange collection.
 */
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  getFirestore,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useGuestStore } from '@/store/useGuestStore';
import type { PokemonCard, ExchangeItem } from '@/types';

const db = getFirestore(app);

export const exchangeService = {
  /**
   * Subscribe to real-time updates on the current user's exchange listings.
   * Returns an unsubscribe function.
   */
  subscribeMyItems(uid: string, onData: (items: ExchangeItem[]) => void): () => void {
    const q = query(collection(db, 'exchange'), where('ownerId', '==', uid));
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map((d) => d.data() as ExchangeItem));
    });
  },

  /** List a card on the public exchange. */
  async addItem(
    uid: string,
    displayName: string,
    email: string | null,
    card: PokemonCard
  ): Promise<string> {
    if (uid === 'demo-guest-uid' || useGuestStore.getState().isGuest) {
      const added = useGuestStore.getState().addExchangeItem(card, displayName);
      return added.exchangeId;
    }
    if (!uid) throw new Error('uid is required');
    if (!card.name || typeof card.name !== 'string') {
      throw new Error('card.name is required and must be a string');
    }

    const newRef = doc(collection(db, 'exchange'));
    await setDoc(newRef, {
      ...card,
      ownerId: uid,
      ownerDisplayName: displayName || email?.split('@')[0] || 'Anonymous',
      listedAt: serverTimestamp(),
      exchangeId: newRef.id,
    });
    return newRef.id;
  },

  /** Remove a listing from the public exchange. */
  async removeItem(exchangeItemId: string): Promise<void> {
    if (useGuestStore.getState().isGuest || exchangeItemId.startsWith('demo-ex-')) {
      useGuestStore.getState().removeExchangeItem(exchangeItemId);
      return;
    }
    if (!exchangeItemId) throw new Error('exchangeItemId is required');

    await deleteDoc(doc(db, 'exchange', exchangeItemId));
  },
};
