import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { enrichCardsWithPrices } from '@/lib/price-enricher';

// Re-initialize Firebase Admin SDK if not already initialized
export async function GET(request: Request, { params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100', 10); // Default to a reasonable limit for set view
  const startAfterNumber = searchParams.get('startAfterNumber');

  if (!setId) {
    return NextResponse.json({ message: 'Set ID is required' }, { status: 400 });
  }

  try {
    const cardsRef = db.collection('pokemon-tcg-cards');

    // We remove the orderBy and limit from the Firestore query to avoid the index requirement.
    // Sets usually have < 300 cards, so fetching all and sorting in memory is fast and safe.
    let querySnapshot = await cardsRef.where('setId', '==', setId).get();
    
    // Fallback for legacy PokemonTCG.io data if needed
    if (querySnapshot.empty) {
      querySnapshot = await cardsRef.where('set.id', '==', setId).get();
    }

    if (querySnapshot.empty) {
      return NextResponse.json([]);
    }

    let cards = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      if (data.image && !data.images) {
        data.images = {
          small: `${data.image}/low.webp`,
          large: `${data.image}/high.webp`,
        };
      }
      if (data.set) {
        data.set = {
          ...data.set,
          series: data.set.serie?.name || data.set.series || 'Uncategorized',
          printedTotal: data.set.cardCount?.official || data.set.printedTotal || 0,
          total: data.set.cardCount?.total || data.set.total || 0,
        };
      }
      return data;
    });

    // Sort in memory by numberAsInt (calculate on the fly if missing)
    cards.sort((a, b) => {
      const parseNum = (val: any, num: string) => {
        if (typeof val === 'number') return val;
        const parsed = parseInt(num);
        return isNaN(parsed) ? 9999 : parsed;
      };
      const numA = parseNum(a.numberAsInt, a.localId || a.number);
      const numB = parseNum(b.numberAsInt, b.localId || b.number);

      if (numA !== numB) return numA - numB;
      const strA = a.localId || a.number || '';
      const strB = b.localId || b.number || '';
      return strA.localeCompare(strB, undefined, { numeric: true });
    });

    // Apply pagination in memory if startAfterNumber is provided
    if (startAfterNumber) {
      const startIndex = cards.findIndex((c) => (c.localId || c.number) === startAfterNumber);
      if (startIndex !== -1) {
        cards = cards.slice(startIndex + 1);
      }
    }

    // Apply limit
    let paginatedCards = cards.slice(0, limit);
    paginatedCards = await enrichCardsWithPrices(paginatedCards);

    const response = NextResponse.json(paginatedCards);
    // Cache for 24 hours since card sets are static
    response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return response;
  } catch (error: any) {
    console.error(`Error fetching cards for set ${setId}:`, error);
    return NextResponse.json(
      { message: error.message || 'An unknown server error occurred.' },
      { status: 500 }
    );
  }
}
