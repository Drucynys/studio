import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
// Re-initialize Firebase Admin SDK if not already initialized
export async function GET() {
  try {
    const collectionRef = db.collection('pokemon-tcg-artists');
    const snapshot = await collectionRef.count().get();
    const count = snapshot.data().count;

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error('Error fetching artists count:', error);
    return NextResponse.json(
      {
        message:
          error.message || 'An unknown server error occurred while fetching the artists count.',
      },
      { status: 500 }
    );
  }
}
