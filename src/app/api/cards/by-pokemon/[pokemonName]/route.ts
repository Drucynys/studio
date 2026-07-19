import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { enrichCardsWithPrices } from '@/lib/price-enricher';

// In-memory catalog cache to avoid Firestore read costs and speed up page loads to <10ms
let cachedCatalog: any[] | null = null;
let lastCacheTime = 1; // Force reset
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

async function getCardCatalog(): Promise<any[]> {
  const now = Date.now();
  if (cachedCatalog && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedCatalog;
  }

  console.log('🔄 Loading Pokedex card catalog from Firestore...');
  const snapshot = await db.collection('pokemon-tcg-cards').get();
  cachedCatalog = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      // Map TCGdex flat image to legacy object structure
      if (data.image && !data.images) {
        data.images = {
          small: `${data.image}/low.webp`,
          large: `${data.image}/high.webp`,
        };
      }
      // Map TCGdex set fields to legacy set fields
      if (data.set) {
        data.set = {
          ...data.set,
          series: data.set.serie?.name || data.set.series || 'Uncategorized',
          printedTotal: data.set.cardCount?.official || data.set.printedTotal || 0,
          total: data.set.cardCount?.total || data.set.total || 0,
        };
      }
      // Provide legacy 'number' property
      if (!data.number && data.localId) {
        data.number = data.localId;
      }
      return data;
    })
    .filter((data) => {
      if (!data.language) return false;
      const seriesName = (data.set?.series || '').toLowerCase();
      const setId = (data.set?.id || '').toLowerCase();
      // Exclude Pocket sets by name or ID (which start with 'A1', 'A2', 'P-A', etc. or exactly 'tcgp' as a series ID if it existed)
      if (seriesName.includes('pocket') || seriesName.includes('tcgp') || setId === 'tcgp') {
        return false;
      }
      return true;
    }); // Only keep new TCGdex cards which have a language field, and exclude Pocket cards
  lastCacheTime = now;
  console.log(`✅ Cached ${cachedCatalog.length} cards for fast Poke-specific fetches.`);
  return cachedCatalog;
}

export async function GET(request: Request, context: { params: Promise<{ pokemonName: string }> }) {
  try {
    const { pokemonName } = await context.params;
    if (!pokemonName) {
      return NextResponse.json({ message: 'Pokémon name is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const catalog = await getCardCatalog();
    const nameLower = pokemonName.toLowerCase();

    // Filter cards featuring this Pokémon.
    // e.g. "Charizard", "Charizard ex", "Dark Charizard", "Surfing Pikachu"
    const results = catalog.filter((card) => {
      if (!card.name) return false;
      const cardNameLower = card.name.toLowerCase();

      // Word boundary match: matches "Pikachu", "Pikachu ex", but not "Pikachuu"
      return (
        cardNameLower === nameLower ||
        cardNameLower.split(' ').includes(nameLower) ||
        cardNameLower.startsWith(nameLower + ' ') ||
        cardNameLower.endsWith(' ' + nameLower)
      );
    });

    // Sort: Exact name matches first, then sort by set release date (newest first), then card number
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === nameLower ? 1 : 0;
      const bExact = b.name.toLowerCase() === nameLower ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      return (b.set?.releaseDate || '').localeCompare(a.set?.releaseDate || '');
    });

    // Pagination
    const startIndex = (page - 1) * pageSize;
    let paginatedResults = results.slice(startIndex, startIndex + pageSize);
    paginatedResults = await enrichCardsWithPrices(paginatedResults);

    // Format matches the external TCG API structure for backward compatibility
    const response = NextResponse.json({
      data: paginatedResults,
      page,
      pageSize,
      totalCount: results.length,
    });

    // Cache for 2 hours on client browser, and revalidate in background on CDN
    response.headers.set('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=86400');
    return response;
  } catch (error) {
    console.error('Error fetching cards for Pokémon:', error);
    return NextResponse.json(
      {
        message: 'Error fetching cards',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
