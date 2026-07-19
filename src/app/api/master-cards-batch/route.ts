import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldPath } from 'firebase-admin/firestore';
import { enrichCardsWithPrices } from '@/lib/price-enricher';

// Re-initialize Firebase Admin SDK if not already initialized
export async function POST(request: Request) {
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json([]);
    }

    const cardsRef = db.collection('pokemon-tcg-cards');
    const uniqueIds = [...new Set(ids)];

    // Firestore 'in' query supports up to 30 elements in the array
    const MAX_IDS_PER_QUERY = 30;
    const idChunks: string[][] = [];
    for (let i = 0; i < uniqueIds.length; i += MAX_IDS_PER_QUERY) {
      idChunks.push(uniqueIds.slice(i, i + MAX_IDS_PER_QUERY));
    }

    const queryPromises = idChunks.map((chunk) =>
      cardsRef.where(FieldPath.documentId(), 'in', chunk).get()
    );

    const snapshotResults = await Promise.all(queryPromises);

    let cards: any[] = [];
    snapshotResults.forEach((snapshot) => {
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.image && !data.images) {
          data.images = {
            small: `${data.image}/low.webp`,
            large: `${data.image}/high.webp`,
          };
        }
        cards.push({ id: doc.id, ...data });
      });
    });

    cards = await enrichCardsWithPrices(cards);
    return NextResponse.json(cards);
  } catch (error: any) {
    console.error('Error fetching master cards in batch:', error);
    return NextResponse.json(
      { message: error.message || 'An unknown server error occurred.' },
      { status: 500 }
    );
  }
}
