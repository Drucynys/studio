
// Placeholder types for TCGPlayer API responses
// You'll need to refine these based on the actual API response structure

export interface TcgPlayerCategory {
  categoryId: number;
  name: string;
  displayName: string;
  modifiedOn: string;
  isSupplemental: boolean;
}

export interface TcgPlayerGroup { // Represents a "Set" in TCGPlayer terms
  groupId: number;
  name: string;
  abbreviation: string | null;
  isSupplemental: boolean;
  publishedOn: string;
  modifiedOn: string;
  categoryId: number;
  supplementalIconUrl?: string; // Placeholder for a potential set icon
  iconUrl?: string; // Placeholder for a potential set icon
}

// You might need more types for products (cards), prices, etc.
// Example for a product (card) - very simplified
export interface TcgPlayerProduct {
  productId: number;
  name: string;
  cleanName: string;
  imageUrl: string;
  groupId: number;
  url: string; // TCGPlayer market URL
  modifiedOn: string;
  // extendedData might contain rarity, number, etc.
  // You'll need to explore the API for exact structure
}
