
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
    firstEd?: number; 
  };
  cards?: TcgDexCardStub[]; 
}

export interface TcgDexCardStub {
  id: string; 
  localId: string; 
  name: string;
  image?: string; 
}

export interface TcgDexCardResume {
  id: string; 
  localId: string; 
  name: string;
  image?: string | null; 
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
  
  normal?: TcgDexCardPriceInfo;
  holofoil?: TcgDexCardPriceInfo;
  reverseHolo?: TcgDexCardPriceInfo;
  firstEditionNormal?: TcgDexCardPriceInfo;
  firstEditionHolofoil?: TcgDexCardPriceInfo;
  // Allow any string as a key for other potential price keys like "1stEditionHolofoil"
  [key: string]: any; 
}

export interface TcgDexCardVariants {
  normal?: boolean;
  reverse?: boolean;
  holo?: boolean;
  firstEdition?: boolean;
  wotc?: boolean; 
  [key: string]: boolean | undefined;
}

export interface TcgDexCard {
  id: string; 
  localId: string; 
  name: string;
  image?: string | null; 
  category: string; 
  rarity: string;
  variants?: TcgDexCardVariants;
  set: {
    id: string;
    name: string;
    logo?: string;
    cardCount: {
      official: number;
      total: number;
    };
  };
  number: string; // Collector number string e.g. "1/102"
  hp?: number;
  types?: string[];
  illustrator?: string;
  description?: string; 
  suffix?: string; 
  prices?: TcgDexCardPrices;
  attacks?: any[]; // Define more specific types if needed
  abilities?: any[]; // Define more specific types if needed
  weaknesses?: any[]; // Define more specific types if needed
  resistances?: any[]; // Define more specific types if needed
  legal?: any; // Define more specific types if needed
  regulationMark?: string;
}
