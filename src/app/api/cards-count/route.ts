import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
// Re-initialize Firebase Admin SDK if not already initialized
export async function GET() {
  try {
    const cardsCollection = db.collection('pokemon-tcg-cards');
    const snapshot = await cardsCollection.count().get();
    const count = snapshot.data().count;

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error('Error fetching card count:', error);
    return NextResponse.json(
      {
        message: error.message || 'An unknown server error occurred while fetching the card count.',
      },
      { status: 500 }
    );
  }
}
