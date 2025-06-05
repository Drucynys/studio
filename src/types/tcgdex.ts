
export interface TcgDexSerie {
  id: string;
  name: string;
  logo?: string;
}

export interface TcgDexSet {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  releaseDate: string;
  serie: TcgDexSerie;
  cardCount: {
    official: number;
    total: number;
    firstEd?: number; // Optional, might not always be present
  };
  cards?: TcgDexCardStub[]; // Sometimes included in set list, but we'll fetch cards separately for detail
}

export interface TcgDexCardStub {
  id: string; // Global card ID like 'base1-1'
  localId: string; // Card number within the set like '1'
  name: string;
  image?: string; // Relative image path if in set details, full if from /cards endpoint
}

export interface TcgDexCardPriceInfo {
  low?: number | null;
  mid?: number | null;
  high?: number | null;
  market?: number | null;
  directLow?: number | null;
}

export interface TcgDexCardPrices {
  average?: number | null;
  low?: number | null;
  trend?: number | null;
  avg1?: number | null;
  avg7?: number | null;
  avg30?: number | null;
  reverseHoloAvg1?: number | null;
  reverseHoloAvg7?: number | null;
  reverseHoloAvg30?: number | null;
  // Prices for different variants/conditions
  normal?: TcgDexCardPriceInfo;
  holofoil?: TcgDexCardPriceInfo;
  reverseHolo?: TcgDexCardPriceInfo;
  firstEditionNormal?: TcgDexCardPriceInfo;
  firstEditionHolofoil?: TcgDexCardPriceInfo;
  [key: string]: any; // For other potential price keys
}

export interface TcgDexCard {
  id: string; // Global card ID 'base1-1'
  localId: string; // Card number within the set '1'
  name: string;
  image?: string; // Full image URL
  category: string; // e.g., "Pokémon", "Trainer", "Energy"
  rarity: string;
  variants?: {
    normal?: boolean;
    reverse?: boolean;
    holo?: boolean;
    firstEdition?: boolean;
    wotc?: boolean; // Watermark of the Wizards of the Coast
    [key: string]: boolean | undefined;
  };
  set: {
    id: string;
    name: string;
    logo?: string;
    cardCount: {
      official: number;
      total: number;
    };
  };
  number: string; // Collector number string
  hp?: number;
  types?: string[];
  illustrator?: string;
  description?: string; // Flavor text or card effect
  suffix?: string; // e.g. V, VMAX, ex
  prices?: TcgDexCardPrices;
  // Other fields as needed
}
