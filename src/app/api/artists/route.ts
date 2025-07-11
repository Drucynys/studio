
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const ARTISTS_COLLECTION = 'pokemon-tcg-artists';
const CARDS_COLLECTION = 'pokemon-tcg-cards';
const BATCH_SIZE = 450; // Firestore batch writes are limited to 500 operations

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) { return; }
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!serviceAccountJson || !projectId) {
        throw new Error("Firebase credentials or Project ID are not set in environment variables.");
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (serviceAccount.private_key) {
        const serviceAccount = JSON.parse(serviceAccountJson);
if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}
    }
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
    });
}

/**
 * GET handler: Fetches the pre-generated list of artists from the 'pokemon-tcg-artists' collection.
 * This is used by the front-end browse pages.
 * This version fetches all artists and sorts them in-memory to avoid needing a composite index.
 */
export async function GET() {
    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        const artistsCollection = db.collection(ARTISTS_COLLECTION);
        
        // Fetch all documents without a specific order from Firestore.
        const snapshot = await artistsCollection.get();

        if (snapshot.empty) {
            return NextResponse.json([]);
        }

        const artists = snapshot.docs.map(doc => doc.data());

        // Sort the results in-memory on the server.
        artists.sort((a: any, b: any) => {
            // Primary sort: cardCount descending
            if (a.cardCount > b.cardCount) return -1;
            if (a.cardCount < b.cardCount) return 1;

            // Secondary sort (tie-breaker): name ascending
            return a.name.localeCompare(b.name);
        });
        
        return NextResponse.json(artists);

    } catch (error: any) {
        console.error('Error fetching artists:', error);
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
        initializeFirebaseAdmin();
        const db = getFirestore();
        logs.push("✅ Firebase Admin SDK initialized.");

        logs.push(`Scanning '${CARDS_COLLECTION}' collection for artists... This may take a moment.`);
        // Use .select('artist') to only fetch the artist field, which is much more efficient
        const snapshot = await db.collection(CARDS_COLLECTION).select('artist').get();
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
        const artistsCollection = db.collection(ARTISTS_COLLECTION);
        const batchPromises: Promise<any>[] = [];

        for (let i = 0; i < artistList.length; i += BATCH_SIZE) {
            const batch = db.batch();
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
