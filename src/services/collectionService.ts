/**
 * collectionService.ts
 * Repository wrapping Firestore operations for users/{uid}/cards
 */
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  getFirestore,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useGuestStore } from '@/store/useGuestStore';
import type { PokemonCard } from '@/types';

const db = getFirestore(app);

export const collectionService = {
  /**
   * Subscribe to real-time updates on a user's card collection.
   * Returns an unsubscribe function.
   */
  subscribe(uid: string, onData: (cards: PokemonCard[]) => void): () => void {
    const ref = collection(db, 'users', uid, 'cards');
    return onSnapshot(ref, (snap) => {
      const cards = snap.docs.map((d) => d.data() as PokemonCard);
      cards.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
      onData(cards);
    });
  },

  /** Add a card to the user's collection. */
  async addCard(
    uid: string,
    card: Omit<PokemonCard, 'id' | 'userId' | 'timestamp'>
  ): Promise<string> {
    if (uid === 'demo-guest-uid' || useGuestStore.getState().isGuest) {
      const added = useGuestStore.getState().addCard(card);
      return added.id;
    }
    if (!uid) throw new Error('uid is required');
    if (!card.name || typeof card.name !== 'string') {
      throw new Error('card.name is required and must be a string');
    }
    if (!card.apiId || typeof card.apiId !== 'string') {
      throw new Error('card.apiId is required and must be a string');
    }

    const userCardsRef = collection(db, 'users', uid, 'cards');
    const newCardRef = doc(userCardsRef);
    await setDoc(newCardRef, {
      ...card,
      id: newCardRef.id,
      userId: uid,
      timestamp: serverTimestamp(),
    });
    return newCardRef.id;
  },

  /** Update a card in the user's collection (merge). */
  async updateCard(uid: string, card: PokemonCard): Promise<void> {
    if (uid === 'demo-guest-uid' || useGuestStore.getState().isGuest) {
      useGuestStore.getState().updateCard(card);
      return;
    }
    if (!uid) throw new Error('uid is required');
    if (!card.id) throw new Error('card.id is required');
    if (uid !== card.userId) throw new Error('Not authorized to update this card');

    await setDoc(doc(db, 'users', uid, 'cards', card.id), card, { merge: true });
  },

  /** Remove a card from the user's collection. */
  async removeCard(uid: string, cardId: string): Promise<void> {
    if (uid === 'demo-guest-uid' || useGuestStore.getState().isGuest) {
      useGuestStore.getState().removeCard(cardId);
      return;
    }
    if (!uid) throw new Error('uid is required');
    if (!cardId) throw new Error('cardId is required');

    await deleteDoc(doc(db, 'users', uid, 'cards', cardId));
  },
};
