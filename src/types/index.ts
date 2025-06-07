
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
}

// Types for Cardmarket Price Guide
export interface CardmarketPrice {
  AVG?: number;      // Average sale price
  LOW?: number;      // Lowest price currently on offer
  TREND?: number;    // Price trend
  LOWEX?: number;    // Lowest price for Excellent+ condition
  LOWFOIL?: number;  // Lowest foil price
  AVGFoil?: number; // Average foil price
  TRENDFOIL?: number;// Foil price trend
  // Potentially other fields like SELL, GERMANPRO, SUGGESTED, etc.
  // The actual fields will depend on the JSON structure from Cardmarket.
  // We'll use optional fields to be safe.
  avg1?: number; // Corresponds to AVG in the provided JSON sample (Average price for the last day)
  avg7?: number; // Average price for the last 7 days
  avg30?: number; // Average price for the last 30 days
  foilAvg1?: number;
  foilAvg7?: number;
  foilAvg30?: number;
}

export interface CardmarketProduct {
  idProduct: number;
  Name: string; // Note: Cardmarket JSON uses "Name" (capital N)
  Expansion: string; // Note: Cardmarket JSON uses "Expansion"
  Number?: string;
  Rarity?: string;
  foil?: boolean; // Not directly in price_guide.json, but useful for context
  
  // Fields from the price_guide_6.json structure:
  "Low Price"?: number;
  "Trend Price"?: number;
  "Average Sell Price"?: number; // avg1 from example
  "7-days Average Price"?: number; // avg7
  "30-days Average Price"?: number; // avg30
  "Trend Price Foil"?: number;
  "Average Sell Price Foil"?: number; // foilAvg1
  "7-days Average Price Foil"?: number; // foilAvg7
  "30-days Average Price Foil"?: number; // foilAvg30
  // The actual JSON might be simpler, e.g. a flat list of products each with a priceGuide object
  // For the linked price_guide_6.json, it seems to be an array of objects like:
  // { "Product ID": 123, "Product": "Card Name", "Expansion": "Set Name", "Low Price": 1.0, "Trend Price": 1.2, ... }
  // So we'll adjust the CardItem matching logic based on this flat structure.
}

// The price_guide_6.json is an array of these product entries
export type CardmarketPriceGuide = CardmarketProduct[];

