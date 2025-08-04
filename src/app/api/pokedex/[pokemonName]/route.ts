
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

export async function GET(request: Request, { params }: { params: { pokemonName: string } }) {
    const { pokemonName } = params;
    if (!pokemonName) {
        return NextResponse.json({ message: 'Pokémon name is required' }, { status: 400 });
    }

    try {
        const pokedexRef = db.collection('pokedex');
        
        // Query the collection for a document where the 'name' field matches the parameter
        const q = pokedexRef.where('name', '==', pokemonName.toLowerCase());
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            return NextResponse.json({ message: 'Pokémon not found in database' }, { status: 404 });
        }

        // Assuming names are unique, there should be only one document
        const pokemonData = querySnapshot.docs[0].data();
        return NextResponse.json(pokemonData);

    } catch (error: any) {
        console.error(`Error fetching Pokémon details for ${pokemonName}:`, error);
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
