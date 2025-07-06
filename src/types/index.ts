// src/types/index.ts
export interface PokemonCard {
  id: string; // Firestore document ID
  userId: string; // ID of the user who owns the card
  set: string;
  cardNumber: string;
  name?: string; 
  rarity: string;
  variant?: string;
  condition: string;
  language: 'English' | 'Japanese';
  value: number; 
  imageUrl?: string;
  quantity: number;
  artist?: string;
  timestamp?: any; // Firestore ServerTimestamp
}
