import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
// Re-initialize Firebase Admin SDK if not already initialized
export async function GET() {
  try {
    const setsCollection = db.collection('pokemon-tcg-sets');
    const snapshot = await setsCollection.orderBy('name', 'asc').get();

    if (snapshot.empty) {
      return NextResponse.json([]);
    }

    const sets = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          series: data.serie?.name || data.series || 'Uncategorized',
          printedTotal: data.cardCount?.official || data.printedTotal || 0,
          total: data.cardCount?.total || data.total || 0,
          images: data.images || {
            logo: data.logo ? `${data.logo}.webp` : null,
            symbol: data.symbol ? `${data.symbol}.webp` : null,
          }
        };
      })
      .filter((set: any) => {
        if (!set.language) return false;
        const seriesName = (set.series || '').toLowerCase();
        const setId = (set.id || '').toLowerCase();
        const isPocketId = setId === 'a1' || setId === 'a1a' || setId === 'a2' || setId === 'a3' || setId === 'a4' || setId === 'p-a' || setId === 'b1' || setId === 'b2' || setId === 'tcgp' ||
                           setId.endsWith('-a1') || setId.endsWith('-a1a') || setId.endsWith('-a2') || setId.endsWith('-a3') || setId.endsWith('-a4') || setId.endsWith('-p-a') || setId.endsWith('-b1') || setId.endsWith('-b2') || setId.endsWith('-tcgp');
        if (seriesName.includes('pocket') || seriesName.includes('tcgp') || isPocketId) {
          return false;
        }
        return true;
      });

    const response = NextResponse.json(sets);
    // Cache for 1 hour, serve stale data for up to 24 hours while revalidating
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return response;
  } catch (error: any) {
    console.error('Error fetching sets:', error);
    return NextResponse.json(
      { message: error.message || 'An unknown server error occurred while fetching sets.' },
      { status: 500 }
    );
  }
}