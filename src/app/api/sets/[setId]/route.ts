import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
// Re-initialize Firebase Admin SDK if not already initialized
export async function GET(request: Request, { params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  if (!setId) {
    return NextResponse.json({ message: 'Set ID is required' }, { status: 400 });
  }

  try {
    const setRef = db.collection('pokemon-tcg-sets').doc(setId);
    const doc = await setRef.get();

    const data = doc.data() || {};
    const setData = {
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
    const response = NextResponse.json(setData);
    response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return response;
  } catch (error: any) {
    console.error(`Error fetching set ${setId}:`, error);
    return NextResponse.json(
      { message: error.message || 'An unknown server error occurred.' },
      { status: 500 }
    );
  }
}
