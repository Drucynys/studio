
import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';

const ARTISTS_COLLECTION = 'pokemon-tcg-artists';
const CARDS_COLLECTION = 'pokemon-tcg-cards';
const BATCH_SIZE = 450; // Firestore batch writes are limited to 500 operations

/**
 * GET handler: Fetches the pre-generated list of artists from the 'pokemon-tcg-artists' collection.
 * This is used by the front-end browse pages.
 * This version uses a proper Firestore query with 'orderBy' for performance and scalability.
 */
export async function GET() {
    try {
        const artistsCollection = dbAdmin.collection(ARTISTS_COLLECTION);
        
        // Use a Firestore query to order the data. This requires a composite index.
        // Index: collection='pokemon-tcg-artists', fields: 'cardCount' (desc), 'name' (asc)
        const snapshot = await artistsCollection
            .orderBy('cardCount', 'desc')
            .get();

        if (snapshot.empty) {
            return NextResponse.json([]);
        }

        const artists = snapshot.docs.map(doc => doc.data());
        
        return NextResponse.json(artists);

    } catch (error: any) {
        console.error('Error fetching artists:', error);
        // Provide a more helpful error message if it's an index issue.
        if (error.message && error.message.includes('requires an index')) {
             return NextResponse.json(
                { 
                    message: 'A database index is required for this query. Please create a composite index in your Firestore settings for the `pokemon-tcg-artists` collection on `cardCount` (descending) and `name` (ascending).',
                    details: error.message
                },
                { status: 500 }
            );
        }
        return NextResponse.json(
            { message: error.message || 'An unknown server error occurred while fetching artists.' },
            { status: 500 }
        );
    }
}


/**
 * POST handler: Scans the entire 'pokemon-tcg-cards' collection, aggregates artist data,
 * and populates the 'pokemon-tcg-artists' collection. Triggered from the admin page.
 */
export async function POST() {
    const logs: string[] = ["- Starting Artist Database Generation -"];
    try {
        logs.push("✅ Firebase Admin SDK initialized.");

        logs.push(`Scanning '${CARDS_COLLECTION}' collection for artists... This may take a moment.`);
        // Use .select('artist') to only fetch the artist field, which is much more efficient
        const snapshot = await dbAdmin.collection(CARDS_COLLECTION).select('artist').get();
        logs.push(`✅ Found ${snapshot.size} total card documents to scan.`);

        if (snapshot.empty) {
            throw new Error("No cards found in the database. Cannot generate artist list.");
        }

        const artistCounts = new Map<string, number>();
        snapshot.forEach(doc => {
            const artist = doc.data().artist;
            if (artist && typeof artist === 'string' && artist.trim() !== '') {
                artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
            }
        });
        logs.push(`✅ Aggregated ${artistCounts.size} unique artists.`);

        const artistList = Array.from(artistCounts.entries()).map(([name, cardCount]) => ({
            name,
            cardCount,
        }));
        
        logs.push(`Writing ${artistList.length} artists to the '${ARTISTS_COLLECTION}' collection...`);
        const artistsCollection = dbAdmin.collection(ARTISTS_COLLECTION);
        const batchPromises: Promise<any>[] = [];

        for (let i = 0; i < artistList.length; i += BATCH_SIZE) {
            const batch = dbAdmin.batch();
            const chunk = artistList.slice(i, i + BATCH_SIZE);
            chunk.forEach(artist => {
                // Sanitize the artist name to create a valid Firestore document ID.
                // Firestore document IDs cannot contain forward slashes ('/').
                const docId = artist.name.replace(/\//g, '_');
                const docRef = artistsCollection.doc(docId);
                batch.set(docRef, artist);
            });
            batchPromises.push(batch.commit());
            logs.push(`Committing a batch of ${chunk.length} artists...`);
        }
        
        await Promise.all(batchPromises);
        logs.push(`✅ Successfully stored ${artistList.length} artists in the database.`);
        
        return NextResponse.json({ status: 'success', count: artistList.length, logs });

    } catch (error: any) {
        console.error('Error generating artist list:', error);
        logs.push(`❌ FATAL ERROR: ${error.message}`);
        return NextResponse.json(
            { status: 'error', message: error.message || 'An unknown server error occurred.', logs },
            { status: 500 }
        );
    }
}
