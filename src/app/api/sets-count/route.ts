
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
        // Fix: Modify the original serviceAccount object directly.
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
        const setsCollection = db.collection('pokemon-tcg-sets');
        const snapshot = await setsCollection.count().get();
        const count = snapshot.data().count;

        return NextResponse.json({ count });
    } catch (error: any) {
        console.error('Error fetching set count:', error);
        return NextResponse.json(
            { message: error.message || 'An unknown server error occurred while fetching the set count.' },
            { status: 500 }
        );
    }
}
