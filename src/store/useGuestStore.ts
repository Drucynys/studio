import { create } from 'zustand';
import type { PokemonCard, WishlistItem, ExchangeItem } from '@/types';
import type { PrivacySetting, Notification } from '@/context/AuthContext';

const DEMO_UID = 'demo-guest-uid';

const DEMO_CARDS: PokemonCard[] = [
  {
    id: "demo-card-1",
    userId: DEMO_UID,
    apiId: "base1-4",
    name: "Charizard",
    set: "Base",
    cardNumber: "4",
    rarity: "Rare Holo",
    language: "English",
    variant: null,
    imageUrl: "https://images.pokemontcg.io/base1/4.png",
    value: 350,
    quantity: 1,
    artist: "Mitsuhiro Arita",
  },
  {
    id: "demo-card-2",
    userId: DEMO_UID,
    apiId: "base1-15",
    name: "Venusaur",
    set: "Base",
    cardNumber: "15",
    rarity: "Rare Holo",
    language: "English",
    variant: null,
    imageUrl: "https://images.pokemontcg.io/base1/15.png",
    value: 120,
    quantity: 1,
    artist: "Mitsuhiro Arita",
  },
  {
    id: "demo-card-3",
    userId: DEMO_UID,
    apiId: "ecard3-61",
    name: "Pikachu",
    set: "Skyridge",
    cardNumber: "61",
    rarity: "Common",
    language: "English",
    variant: null,
    imageUrl: "https://images.pokemontcg.io/ecard3/61.png",
    value: 45,
    quantity: 2,
    artist: "Atsuko Nishida",
  },
];

interface GuestState {
  isGuest: boolean;
  collection: PokemonCard[];
  wishlist: WishlistItem[];
  exchangeItems: ExchangeItem[];
  notifications: Notification[];
  following: string[];
  privacySetting: PrivacySetting;

  // Actions
  activateGuestMode: () => void;
  deactivateGuestMode: () => void;

  addCard: (card: Omit<PokemonCard, 'id' | 'userId' | 'timestamp'>) => PokemonCard;
  updateCard: (card: PokemonCard) => void;
  removeCard: (cardId: string) => void;

  addWishlistItem: (item: Omit<WishlistItem, 'id' | 'userId' | 'timestamp'>) => WishlistItem;
  removeWishlistItem: (itemId: string) => void;

  addExchangeItem: (card: PokemonCard, displayName: string) => ExchangeItem;
  removeExchangeItem: (exchangeId: string) => void;

  updatePrivacySetting: (setting: PrivacySetting) => void;
  markNotificationsAsRead: (ids: string[]) => void;
  updateDisplayName: (name: string) => void;
}

const createMockTimestamp = () => ({
  toMillis: () => Date.now(),
  toDate: () => new Date(),
} as any);

export const useGuestStore = create<GuestState>((set, get) => ({
  isGuest: false,
  collection: [],
  wishlist: [],
  exchangeItems: [],
  notifications: [],
  following: [],
  privacySetting: 'everyone',

  activateGuestMode: () =>
    set({
      isGuest: true,
      collection: [...DEMO_CARDS],
      wishlist: [],
      exchangeItems: [],
      notifications: [],
      following: [],
      privacySetting: 'everyone',
    }),

  deactivateGuestMode: () =>
    set({
      isGuest: false,
      collection: [],
      wishlist: [],
      exchangeItems: [],
      notifications: [],
      following: [],
      privacySetting: 'everyone',
    }),

  addCard: (card) => {
    const newCard: PokemonCard = {
      ...card,
      id: `demo-card-${Date.now()}`,
      userId: DEMO_UID,
      timestamp: createMockTimestamp(),
    };
    set((state) => ({ collection: [newCard, ...state.collection] }));
    return newCard;
  },

  updateCard: (card) =>
    set((state) => ({
      collection: state.collection.map((c) => (c.id === card.id ? card : c)),
    })),

  removeCard: (cardId) =>
    set((state) => ({
      collection: state.collection.filter((c) => c.id !== cardId),
    })),

  addWishlistItem: (item) => {
    const newItem: WishlistItem = {
      ...item,
      id: `demo-wish-${Date.now()}`,
      userId: DEMO_UID,
      timestamp: createMockTimestamp(),
    };
    set((state) => ({ wishlist: [newItem, ...state.wishlist] }));
    return newItem;
  },

  removeWishlistItem: (itemId) =>
    set((state) => ({
      wishlist: state.wishlist.filter((w) => w.id !== itemId),
    })),

  addExchangeItem: (card, displayName) => {
    const newItem: ExchangeItem = {
      ...card,
      ownerId: DEMO_UID,
      ownerDisplayName: displayName || 'Demo Trainer',
      listedAt: createMockTimestamp(),
      exchangeId: `demo-ex-${Date.now()}`,
    } as any;
    set((state) => ({ exchangeItems: [newItem, ...state.exchangeItems] }));
    return newItem;
  },

  removeExchangeItem: (exchangeId) =>
    set((state) => ({
      exchangeItems: state.exchangeItems.filter((e) => e.exchangeId !== exchangeId),
    })),

  updatePrivacySetting: (setting) => set({ privacySetting: setting }),

  markNotificationsAsRead: (ids) => {
    const idSet = new Set(ids);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        idSet.has(n.id) ? { ...n, read: true } : n
      ),
    }));
  },

  updateDisplayName: (_name: string) => {
    // Guest display name is held on the mock User object in AuthContext.
    // This is a no-op placeholder for symmetry.
  },
}));
