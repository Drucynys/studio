import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
// Re-initialize Firebase Admin SDK if not already initialized
export async function GET() {
  try {
    const setsCollection = db.collection('pokemon-tcg-sets');
    const snapshot = await setsCollection.orderBy('releaseDate', 'desc').get();

    if (snapshot.empty) {
      return NextResponse.json([]);
    }

    const sets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

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
