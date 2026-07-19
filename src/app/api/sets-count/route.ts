import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
// Re-initialize Firebase Admin SDK if not already initialized
export async function GET() {
  try {
    const setsCollection = db.collection('pokemon-tcg-sets');
    const snapshot = await setsCollection.get();
    let count = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const seriesName = (data.serie?.name || data.series || '').toLowerCase();
      const setId = (doc.id || '').toLowerCase();
      if (!seriesName.includes('pocket') && !seriesName.includes('tcgp') && setId !== 'tcgp') {
        count++;
      }
    });

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error('Error fetching set count:', error);
    return NextResponse.json(
      {
        message: error.message || 'An unknown server error occurred while fetching the set count.',
      },
      { status: 500 }
    );
  }
}
