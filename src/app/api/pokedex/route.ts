
import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';

/**
 * GET handler to fetch the entire Pokédex, ordered by national Pokédex ID.
 * This now uses a proper Firestore query with 'orderBy' for performance.
 */
export async function GET() {
    try {
        const pokedexCollection = dbAdmin.collection('pokedex');
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
