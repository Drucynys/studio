
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Safe initialization function
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

export async function GET(request: Request, { params }: { params: { pokemonName: string } }) {
    const { pokemonName } = params;
    if (!pokemonName) {
        return NextResponse.json({ message: 'Pokémon name is required' }, { status: 400 });
    }

    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
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

    