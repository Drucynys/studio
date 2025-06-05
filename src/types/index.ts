
export interface PokemonCard {
  id: string;
  set: string;
  cardNumber: string;
  name?: string; // Optional, could be auto-fetched or manually entered
  rarity: string;
  condition: string;
  value: number;
  imageUrl?: string; // Optional: for displaying card image if available
  variant?: string; // e.g., "Holofoil", "Reverse Holo", "Normal"
}
