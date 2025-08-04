
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

export async function GET(request: Request, { params }: { params: { setId: string } }) {
    const { setId } = params;
    if (!setId) {
        return NextResponse.json({ message: 'Set ID is required' }, { status: 400 });
    }

    try {
        const setRef = db.collection('pokemon-tcg-sets').doc(setId);
        const doc = await setRef.get();

        if (!doc.exists) {
            return NextResponse.json({ message: 'Set not found in database' }, { status: 404 });
        }

        return NextResponse.json({ id: doc.id, ...doc.data() });
    } catch (error: any) {
        console.error(`Error fetching set ${setId}:`, error);
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
