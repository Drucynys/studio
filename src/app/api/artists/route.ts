
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return;
    }
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!serviceAccountJson) {
        throw new Error("CRITICAL: The GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set.");
    }
    if (!projectId) {
        throw new Error("CRITICAL: The FIREBASE_PROJECT_ID environment variable is not set.");
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
    });
}

export async function GET() {
    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        // Use .select('artist') to only fetch the artist field, which is much more efficient
        const snapshot = await db.collection('pokemon-tcg-cards').select('artist').get();

        if (snapshot.empty) {
            return NextResponse.json({ message: "No cards found in the database. Cannot generate artist list." }, { status: 404 });
        }

        const artistCounts = new Map<string, number>();

        snapshot.forEach(doc => {
            const artist = doc.data().artist;
            if (artist && typeof artist === 'string' && artist.trim() !== '') {
                artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
            }
        });

        const artistList = Array.from(artistCounts.entries()).map(([name, cardCount]) => ({
            name,
            cardCount,
        }));
        
        // Sort alphabetically by artist name for a consistent output
        artistList.sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json(artistList);

    } catch (error: any) {
        console.error('Error generating artist list:', error);
        return NextResponse.json(
            { message: error.message || 'An unknown server error occurred while generating the artist list.' },
            { status: 500 }
        );
    }
}
