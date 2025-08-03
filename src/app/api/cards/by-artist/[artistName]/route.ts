import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Safe initialization function (same as your working set API)
function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return;
    }
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    
    if (!serviceAccountJson) {
        throw new Error("CRITICAL: The GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set. The sync tool cannot authenticate with the database.");
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

export async function GET(
    request: Request,
    { params }: { params: Promise<{ artistName: string }> }
) {
    const { artistName } = await params;
    
    if (!artistName) {
        return NextResponse.json({ message: 'Artist name is required' }, { status: 400 });
    }

    // Decode the artist name from the URL (e.g., "Ken%20Sugimori" -> "Ken Sugimori")
    const decodedArtistName = decodeURIComponent(artistName);

    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        const cardsRef = db.collection('pokemon-tcg-cards');
        
        // This query requires a single-field index on 'artist'. 
        // Firestore can usually create this automatically, but sometimes it needs to be done manually.
        // The previous limit of 100 has been removed to show all cards.
        const querySnapshot = await cardsRef.where('artist', '==', decodedArtistName).get();

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
