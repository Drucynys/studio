
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
  { params }: { params: Promise<{ setId:string }> }
) {
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
    const querySnapshot = await cardsRef
        .where('set.id', '==', setId)
        .get();

    if (querySnapshot.empty) {
        return NextResponse.json([]);
    }

    let cards = querySnapshot.docs.map(doc => doc.data());

    // Sort in memory by numberAsInt (calculate on the fly if missing)
    cards.sort((a, b) => {
        const parseNum = (val: any, num: string) => {
            if (typeof val === 'number') return val;
            const parsed = parseInt(num);
            return isNaN(parsed) ? 9999 : parsed;
        };
        const numA = parseNum(a.numberAsInt, a.number);
        const numB = parseNum(b.numberAsInt, b.number);
        
        if (numA !== numB) return numA - numB;
        return (a.number || "").localeCompare(b.number || "", undefined, { numeric: true });
    });

    // Apply pagination in memory if startAfterNumber is provided
    if (startAfterNumber) {
        const startIndex = cards.findIndex(c => c.number === startAfterNumber);
        if (startIndex !== -1) {
            cards = cards.slice(startIndex + 1);
        }
    }

    // Apply limit
    const paginatedCards = cards.slice(0, limit);

    const response = NextResponse.json(paginatedCards);
    // Cache for 24 hours since card sets are static
    response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return response;
  } catch (error: any) {
    console.error(`Error fetching cards for set ${setId}:`, error);
    return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
  }
}
