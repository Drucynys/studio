
export interface PokemonCard {
  id: string;
  set: string;
  cardNumber: string;
  name?: string; // Optional, could be auto-fetched or manually entered
  rarity: string;
  variant?: string;
  condition: string;
  language: 'English' | 'Japanese'; // Added language field
  value: number; // This is typically TCGPlayer value in USD
  imageUrl?: string; // Optional: for displaying card image if available
  quantity: number;
  artist?: string;
}
