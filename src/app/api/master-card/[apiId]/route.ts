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

export async function GET(
    request: Request,
    context: { params: { apiId: string } }
) {
    const { apiId } = context.params;
    if (!apiId) {
        return NextResponse.json({ message: 'Card API ID is required' }, { status: 400 });
    }

    try {
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
