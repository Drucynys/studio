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

export async function POST(request: Request) {
    try {
        const { ids } = await request.json();
        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json([]);
        }

        initializeFirebaseAdmin();
        const db = getFirestore();
        const cardsRef = db.collection('pokemon-tcg-cards');
        const uniqueIds = [...new Set(ids)];

        // Firestore 'in' query supports up to 30 elements in the array
        const MAX_IDS_PER_QUERY = 30;
        const idChunks: string[][] = [];
        for (let i = 0; i < uniqueIds.length; i += MAX_IDS_PER_QUERY) {
            idChunks.push(uniqueIds.slice(i, i + MAX_IDS_PER_QUERY));
        }

        const queryPromises = idChunks.map(chunk =>
            cardsRef.where(admin.firestore.FieldPath.documentId(), 'in', chunk).get()
        );

        const snapshotResults = await Promise.all(queryPromises);

        const cards: any[] = [];
        snapshotResults.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                cards.push(doc.data());
            });
        });

        return NextResponse.json(cards);

    } catch (error: any) {
        console.error('Error fetching master cards in batch:', error);
        return NextResponse.json(
            { message: error.message || 'An unknown server error occurred.' },
            { status: 500 }
        );
    }
}
