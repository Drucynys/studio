
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
    { params }: { params: { artistName: string } }
) {
    const { artistName } = params;
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000', 10);
    const startAfterNumber = searchParams.get('startAfterNumber');

    if (!artistName) {
        return NextResponse.json({ message: 'Artist name is required' }, { status: 400 });
    }

    const decodedArtistName = decodeURIComponent(artistName);

    try {
        const cardsRef = db.collection('pokemon-tcg-cards');
        
        // Fetch all cards for the artist and sort in memory to avoid composite index requirements.
        // Even the most prolific artists (like Mitsuhiro Arita) have < 1000 cards.
        const querySnapshot = await cardsRef
            .where('artist', '==', decodedArtistName)
            .get();

        if (querySnapshot.empty) {
            return NextResponse.json([]);
        }

        let cards = querySnapshot.docs.map(doc => doc.data());

        // Sort in memory: Release Date (desc) then Number (asc)
        cards.sort((a, b) => {
            const dateA = new Date(a.set?.releaseDate || 0).getTime();
            const dateB = new Date(b.set?.releaseDate || 0).getTime();
            if (dateB !== dateA) return dateB - dateA;
            
            const numA = a.numberAsInt ?? 999;
            const numB = b.numberAsInt ?? 999;
            return numA - numB;
        });

        // Apply simple pagination if needed
        if (startAfterNumber) {
            const startIndex = cards.findIndex(c => c.number === startAfterNumber);
            if (startIndex !== -1) {
                cards = cards.slice(startIndex + 1);
            }
        }

        return NextResponse.json(cards.slice(0, limit));
    } catch (error: any) {
        console.error(`Error fetching cards for artist ${decodedArtistName}:`, error);
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
