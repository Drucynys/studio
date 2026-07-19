import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { enrichCardsWithPrices } from '@/lib/price-enricher';

// Define the exact shape of a Pokemon card from the API that we need for search
interface ApiPokemonCard {
  id: string;
  name: string;
  set: {
    id: string;
    name: string;
    series: string;
    logo?: string;
    releaseDate: string;
    printedTotal: number;
    total: number;
  };
  number: string;
  rarity?: string;
  artist?: string;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    prices?: {
      [key: string]: {
        market?: number | null;
        low?: number | null;
        mid?: number | null;
        high?: number | null;
      };
    };
  };
}

// Extended type for cached card with precomputed lowercase fields for faster searching
interface CachedCard extends ApiPokemonCard {
  nameLower: string;
  numberLower: string;
  setNameLower: string;
  artistLower: string;
}

// In-memory server cache for instant search with stale-while-revalidate
let catalog: CachedCard[] | null = null; // Last known good catalog
let lastCacheTime = 1;
let catalogPromise: Promise<CachedCard[]> | null = null; // Promise for ongoing refresh
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours fresh
const STALE_TTL_MS = CACHE_TTL_MS * 2;   // 12 hours - still usable while refreshing

/**
 * Fetches a fresh catalog from Firestore and prepares it with precomputed lowercase fields
 */
function fetchFreshCatalog(): Promise<CachedCard[]> {
  console.log('🔄 Loading fresh search catalog from Firestore...');
  const now = Date.now();
  lastCacheTime = now; // Update immediately to prevent multiple simultaneous refreshes

  return db
    .collection('pokemon-tcg-cards')
    .get()
    .then((snapshot) => {
      const cards = snapshot.docs.map((doc) => {
        const rawData = doc.data() as any;
        return {
          ...rawData,
          set: rawData.set ? {
            ...rawData.set,
            series: rawData.set.serie?.name || rawData.set.series || 'Uncategorized',
            printedTotal: rawData.set.cardCount?.official || rawData.set.printedTotal || 0,
            total: rawData.set.cardCount?.total || rawData.set.total || 0,
          } : undefined,
          images: rawData.images || (rawData.image ? { small: `${rawData.image}/low.webp`, large: `${rawData.image}/high.webp` } : { small: '', large: '' }),
          nameLower: rawData.name?.toLowerCase() || '',
          numberLower: rawData.number?.toLowerCase() || '',
          setNameLower: rawData.set?.name?.toLowerCase() || '',
          artistLower: rawData.artist?.toLowerCase() || '',
        } as CachedCard;
      }).filter((data) => {
        if (!(data as any).language) return false;
        const seriesName = ((data as any).set?.series || '').toLowerCase();
        const setId = ((data as any).set?.id || '').toLowerCase();
        if (seriesName.includes('pocket') || seriesName.includes('tcgp') || setId === 'tcgp') {
          return false;
        }
        return true;
      });
      console.log(`✅ Cached ${cards.length} cards in server memory for instant search.`);
      return cards;
    })
    .catch((err) => {
      console.error('❌ Failed to fetch fresh catalog:', err);
      // Keep lastCacheTime unchanged so we can retry on next request
      throw err;
    });
}

/**
 * Gets the catalog with stale-while-revalidate strategy:
 * - Fresh cache (< TTL): return immediately
 * - Stale cache (>= TTL and < 2*TTL): return stale + trigger background refresh
 * - Expired cache (>= 2*TTL): wait for fresh fetch
 */
function getCardCatalog(): Promise<CachedCard[]> {
  const now = Date.now();

  // Case 1: We have fresh cache (< TTL)
  if (catalog && now - lastCacheTime < CACHE_TTL_MS) {
    return Promise.resolve(catalog);
  }

  // Case 2: We have stale cache (>= TTL but < 2*TTL) - return stale and refresh in background
  if (catalog && now - lastCacheTime < STALE_TTL_MS) {
    // Trigger background refresh if not already in progress
    if (!catalogPromise) {
      catalogPromise = fetchFreshCatalog().then((freshCatalog) => {
        catalog = freshCatalog;
        lastCacheTime = Date.now();
        catalogPromise = null; // Reset promise after refresh completes
        return catalog;
      }).catch((err) => {
        // On error, keep stale cache and reset promise for next retry
        catalogPromise = null;
        throw err;
      });
    }
    // Return stale cache immediately while refresh happens in background
    return Promise.resolve(catalog);
  }

  // Case 3: No cache or very stale (>= 2*TTL) - wait for fresh fetch
  if (!catalogPromise) {
    catalogPromise = fetchFreshCatalog().then((freshCatalog) => {
      catalog = freshCatalog;
      lastCacheTime = Date.now();
      catalogPromise = null; // Reset promise after refresh completes
      return catalog;
    }).catch((err) => {
      catalogPromise = null; // Reset promise on error for next retry
      throw err;
    });
  }

  return catalogPromise;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const qRaw = searchParams.get('q');
    const offsetRaw = searchParams.get('offset');
    const limitRaw = searchParams.get('limit');

    // Parse and validate pagination parameters
    const offset = offsetRaw ? Math.max(0, parseInt(offsetRaw)) : 0;
    const limit = limitRaw ? Math.min(Math.max(1, parseInt(limitRaw)), 100) : 48; // Max 100 to prevent abuse

    if (!qRaw || qRaw.trim().length === 0) {
      return NextResponse.json([]);
    }

    const q = qRaw.trim().toLowerCase();
    const catalogData = await getCardCatalog();

    // Check for "number/total" exact format (e.g. "4/102" or "135/165")
    const numMatch = q.match(/^(\d+)\s*\/\s*(\d+)$/);

    const results = catalogData.filter((card) => {
      if (numMatch) {
        const targetNum = numMatch[1];
        const targetTotal = parseInt(numMatch[2]);
        return (
          card.number === targetNum &&
          (card.set?.printedTotal === targetTotal || card.set?.total === targetTotal)
        );
      }

      // Split query into terms for multi-term search (ALL terms must match)
      const queryTerms = q.split(/\s+/).filter((term) => term.length > 0);

      // If no valid terms after splitting, fall back to original behavior
      if (queryTerms.length === 0) {
        return false;
      }

      // For each term, check if it matches ANY of the searchable fields
      // All terms must have at least one matching field
      return queryTerms.every((term) => {
        const nameMatch = card.nameLower.includes(term);
        const numExactMatch = card.numberLower === term;
        const setNameMatch = card.setNameLower.includes(term);
        const artistMatch = card.artistLower.includes(term);

        return nameMatch || numExactMatch || setNameMatch || artistMatch;
      });
    });

    // Score and sort for best relevance (same logic as before)
    results.sort((a, b) => {
      const aNameExact = a.name?.toLowerCase() === q ? 1 : 0;
      const bNameExact = b.name?.toLowerCase() === q ? 1 : 0;
      if (aNameExact !== bNameExact) return bNameExact - aNameExact;

      const aNumExact = a.number?.toLowerCase() === q ? 1 : 0;
      const bNumExact = b.number?.toLowerCase() === q ? 1 : 0;
      if (aNumExact !== bNumExact) return bNumExact - aNumExact;

      const aNameStarts = a.name?.toLowerCase().startsWith(q) ? 1 : 0;
      const bNameStarts = b.name?.toLowerCase().startsWith(q) ? 1 : 0;
      if (aNameStarts !== bNameStarts) return bNameStarts - aNameStarts;

      // Fallback sort by release date newer first or card number
      return (b.set?.releaseDate || '').localeCompare(a.set?.releaseDate || '');
    });

    // Apply pagination
    let paginated = results.slice(offset, offset + limit);
    paginated = await enrichCardsWithPrices(paginated);

    const response = NextResponse.json({
      results: paginated,
      total: results.length, // Total matches for this query
      offset,
      limit
    });
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return response;
  } catch (error) {
    console.error('Error in search-cards NoSQL route:', error);
    return NextResponse.json(
      {
        message: 'Error searching for cards',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}