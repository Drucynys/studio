
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

export async function GET(request: Request, { params }: { params: { setId: string } }) {
    const { setId } = params;
    if (!setId) {
        return NextResponse.json({ message: 'Set ID is required' }, { status: 400 });
    }

    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        const cardsRef = db.collection('pokemon-tcg-cards');
        const querySnapshot = await cardsRef.where('set.id', '==', setId).get();

        if (querySnapshot.empty) {
            return NextResponse.json([]);
        }

        const cards = querySnapshot.docs.map(doc => doc.data());
        return NextResponse.json(cards);
    } catch (error: any) {
        console.error(`Error fetching cards for set ${setId}:`, error);
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}

    