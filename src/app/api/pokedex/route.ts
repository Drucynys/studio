
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

export async function GET() {
    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        const pokedexCollection = db.collection('pokedex');
        // Fetch all documents and order them by the 'id' field, which is numeric
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

    