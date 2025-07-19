
import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';

export async function GET(
    request: Request,
    { params }: { params: { artistName: string } }
) {
    const { artistName } = params;
    if (!artistName) {
        return NextResponse.json({ message: 'Artist name is required' }, { status: 400 });
    }

    // Decode the artist name from the URL (e.g., "Ken%20Sugimori" -> "Ken Sugimori")
    const decodedArtistName = decodeURIComponent(artistName);

    try {
        const cardsRef = dbAdmin.collection('pokemon-tcg-cards');
        
        // This query requires a single-field index on 'artist'. 
        // Firestore can usually create this automatically, but sometimes it needs to be done manually.
        // We limit the results to 100 to ensure performance.
        const querySnapshot = await cardsRef.where('artist', '==', decodedArtistName).limit(100).get();

        if (querySnapshot.empty) {
            return NextResponse.json([]);
        }

        const cards = querySnapshot.docs.map(doc => doc.data());
        return NextResponse.json(cards);
    } catch (error: any) {
        console.error(`Error fetching cards for artist ${decodedArtistName}:`, error);
        
        // Specific check for the "requires an index" error from Firestore
        if (error.message && error.message.includes('requires an index')) {
             return NextResponse.json(
                { 
                    message: `A database index is required to query by artist. Please create a single-field index in your Firestore settings for the 'pokemon-tcg-cards' collection on the 'artist' field.`,
                    details: error.message
                },
                { status: 500 }
            );
        }

        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
