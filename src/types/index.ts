
export interface PokemonCard {
  id: string;
  set: string;
  cardNumber: string;
  name?: string; // Optional, could be auto-fetched or manually entered
  rarity: string;
  variant?: string; // Re-added for selected variant
  condition: string;
  value: number;
  imageUrl?: string; // Optional: for displaying card image if available
}
