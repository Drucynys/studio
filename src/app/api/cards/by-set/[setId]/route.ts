
import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(
  request: Request,
  { params }: { params: { setId: string } }
) {
  const { setId } = params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const startAfterNumber = searchParams.get('startAfterNumber');

  if (!setId) {
    return NextResponse.json({ message: 'Set ID is required' }, { status: 400 });
  }

  try {
    const cardsRef = dbAdmin.collection('pokemon-tcg-cards');
    
    // This query requires a composite index on set.id (asc), number (asc)
    let query = cardsRef
        .where('set.id', '==', setId)
        .orderBy('number', 'asc')
        .limit(limit);

    if (startAfterNumber) {
        query = query.startAfter(startAfterNumber);
    }

    const querySnapshot = await query.get();

    if (querySnapshot.empty) {
        return NextResponse.json([]);
    }

    const cards = querySnapshot.docs.map(doc => doc.data());
    return NextResponse.json(cards);
  } catch (error: any) {
    console.error(`Error fetching cards for set ${setId}:`, error);
    if (error.message && error.message.includes('requires an index')) {
      return NextResponse.json(
        {
          message: `A database index is required to query by set ID and sort by number. Please create a composite index in Firestore for the 'pokemon-tcg-cards' collection on 'set.id' (ascending) and 'number' (ascending).`,
          details: error.message
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
  }
}
