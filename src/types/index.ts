// src/types/index.ts
export interface PokemonCard {
  id: string; // Firestore document ID
  apiId: string; // The ID from the pokemontcg.io API (e.g., "base1-4")
  userId: string; // ID of the user who owns the card
  set: string;
  cardNumber: string;
  name: string;
  rarity: string;
  variant: string | null;
  language: 'English' | 'Japanese';
  value: number;
  imageUrl: string | null;
  quantity: number;
  artist: string | null;
  timestamp?: any; // Firestore ServerTimestamp
  isFavorite?: boolean;
}

export interface WishlistItem {
  id: string; // Firestore document ID
  apiId: string; // The ID from the pokemontcg.io API
  userId: string;
  set: string;
  cardNumber: string;
  name: string;
  rarity: string;
  imageUrl: string | null;
  artist: string | null;
  timestamp?: any; // Firestore ServerTimestamp
}

export interface ExchangeItem extends PokemonCard {
  ownerId: string;
  ownerDisplayName: string;
  exchangeId: string; // The document ID from the top-level 'exchange' collection
}
