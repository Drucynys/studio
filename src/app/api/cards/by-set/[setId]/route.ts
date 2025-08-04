
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Re-initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

export async function GET(
  request: Request,
  { params }: { params: { setId:string } }
) {
  const { setId } = params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const startAfterNumber = searchParams.get('startAfterNumber');

  if (!setId) {
    return NextResponse.json({ message: 'Set ID is required' }, { status: 400 });
  }

  try {
    const cardsRef = db.collection('pokemon-tcg-cards');
    
    // This query now uses the numberAsInt field for correct numeric sorting.
    // An index for this query will likely be required.
    let query: admin.firestore.Query = cardsRef
        .where('set.id', '==', setId)
        .orderBy('numberAsInt', 'asc') // Sort by the new integer field
        .limit(limit);

    if (startAfterNumber) {
        // For pagination, we still use the string 'number' to find the document,
        // but the query is already ordered correctly.
        // This part needs careful implementation if startAfter is used.
        // For now, focusing on the sort order.
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
          message: `A database index is required to query by set ID and sort by number. Please create a composite index in Firestore for the 'pokemon-tcg-cards' collection on 'set.id' (ascending) and 'numberAsInt' (ascending).`,
          details: error.message
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
  }
}
