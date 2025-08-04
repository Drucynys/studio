import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(
    request: Request,
    { params }: { params: { artistName: string } }
) {
    const { artistName } = params;
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const startAfterReleaseDate = searchParams.get('startAfterReleaseDate');
    const startAfterNumber = searchParams.get('startAfterNumber');

    if (!artistName) {
        return NextResponse.json({ message: 'Artist name is required' }, { status: 400 });
    }

    const decodedArtistName = decodeURIComponent(artistName);

    try {
        const cardsRef = dbAdmin.collection('pokemon-tcg-cards');
        
        // This query requires a composite index on artist (asc), set.releaseDate (desc), number (asc)
        let query = cardsRef
            .where('artist', '==', decodedArtistName)
            .orderBy('set.releaseDate', 'desc')
            .orderBy('number', 'asc')
            .limit(limit);
        
        if (startAfterReleaseDate && startAfterNumber) {
            // Firestore timestamps need to be handled correctly for pagination
            const releaseDateTimestamp = Timestamp.fromDate(new Date(startAfterReleaseDate));
            query = query.startAfter(releaseDateTimestamp, startAfterNumber);
        }
        
        const querySnapshot = await query.get();

        if (querySnapshot.empty) {
            return NextResponse.json([]);
        }

        const cards = querySnapshot.docs.map(doc => doc.data());
        return NextResponse.json(cards);
    } catch (error: any) {
        console.error(`Error fetching cards for artist ${decodedArtistName}:`, error);
        
        if (error.message && error.message.includes('requires an index')) {
             return NextResponse.json(
                { 
                    message: `A database index is required to query by artist and sort by release date. Please create a composite index in your Firestore settings for the 'pokemon-tcg-cards' collection on 'artist' (ascending), 'set.releaseDate' (descending), and 'number' (ascending).`,
                    details: error.message
                },
                { status: 500 }
            );
        }

        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
