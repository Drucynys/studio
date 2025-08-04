
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

/**
 * GET handler to fetch the entire Pokédex, ordered by national Pokédex ID.
 * This now uses a proper Firestore query with 'orderBy' for performance.
 */
export async function GET() {
    try {
        const pokedexCollection = db.collection('pokedex');
        // Fetch all documents and order them by the 'id' field, which is the numeric Pokédex ID.
        // This requires a single-field index on 'id' (ascending), which Firestore can create automatically.
        const snapshot = await pokedexCollection.orderBy('id').get();

        if (snapshot.empty) {
            return NextResponse.json([]);
        }

        const pokemon = snapshot.docs.map(doc => doc.data());
        return NextResponse.json(pokemon);

    } catch (error: any) {
        console.error('Error fetching pokedex:', error);
        return NextResponse.json(
            { message: error.message || 'An unknown server error occurred while fetching the Pokédex.' },
            { status: 500 }
        );
    }
}
