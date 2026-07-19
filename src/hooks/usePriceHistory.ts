import { useState, useEffect } from 'react';

export interface DailyPriceData {
  avg?: number;
  count?: number;
  min?: number;
  max?: number;
}

export interface VariantPriceHistory {
  history: Record<string, DailyPriceData>;
}

export interface TcgPlayerPriceData {
  data: Record<string, VariantPriceHistory>;
}

export function usePriceHistory(cardId: string | null | undefined) {
  const [data, setData] = useState<TcgPlayerPriceData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) {
      setData(null);
      return;
    }

    const fetchPriceHistory = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // cardId is usually something like "base1-44"
        const parts = cardId.split('-');
        if (parts.length < 2) {
          throw new Error("Invalid card ID format. Expected 'setId-localId'.");
        }
        
        // Handle cases where the set ID might have hyphens by taking all but the last part as set ID
        const localId = parts.pop();
        const setId = parts.join('-');
        
        let finalLocalId = localId;
        // Strip leading zeros if purely numeric, as TCGdex repos typically don't use them
        if (finalLocalId && /^0+\d+$/.test(finalLocalId)) {
          finalLocalId = finalLocalId.replace(/^0+/, '');
        }
        
        const response = await fetch(`https://raw.githubusercontent.com/tcgdex/price-history/master/en/${setId}/${finalLocalId}.tcgplayer.json`);
        
        if (response.status === 404) {
          setData(null);
          return; // Gracefully handle missing data without showing an error
        }
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText || 'Failed to fetch'}`);
        }
        
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        console.error("Error fetching price history:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceHistory();
  }, [cardId]);

  return { data, loading, error };
}
