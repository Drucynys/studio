import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Safe initialization function
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
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const startAfterDate = searchParams.get('startAfterDate');
    const startAfterNumber = searchParams.get('startAfterNumber');

    if (!artistName) {
        return NextResponse.json({ message: 'Artist name is required' }, { status: 400 });
    }

    const decodedArtistName = decodeURIComponent(artistName);

    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        const cardsRef = db.collection('pokemon-tcg-cards');
        
        let query = cardsRef
            .where('artist', '==', decodedArtistName)
            .orderBy('set.releaseDate', 'asc')
            .orderBy('number', 'asc')
            .limit(limit);

        if (startAfterDate && startAfterNumber) {
            query = query.startAfter(startAfterDate, startAfterNumber);
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
                    message: `A database index is required to query by artist. Please create a composite index in your Firestore settings for the 'pokemon-tcg-cards' collection on 'artist' (asc), 'set.releaseDate' (asc), and 'number' (asc).`,
                    details: error.message
                },
                { status: 500 }
            );
        }

        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
