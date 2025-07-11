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
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
    });
}

export async function GET(
    request: Request,
    context: { params: Promise<{ apiId: string }> }
) {
    const { apiId } = await context.params;
    if (!apiId) {
        return NextResponse.json({ message: 'Card API ID is required' }, { status: 400 });
    }

    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        const cardRef = db.collection('pokemon-tcg-cards').doc(apiId);
        const docSnap = await cardRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ message: 'Card not found in master database. It may not have been synced yet.' }, { status: 404 });
        }

        return NextResponse.json(docSnap.data());
    } catch (error: any) {
        console.error(`Error fetching master card ${apiId}:`, error);
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
