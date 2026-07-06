
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

export async function GET(request: Request, { params }: { params: Promise<{ setId: string }> }) {
    const { setId } = await params;
    if (!setId) {
        return NextResponse.json({ message: 'Set ID is required' }, { status: 400 });
    }

    try {
        const setRef = db.collection('pokemon-tcg-sets').doc(setId);
        const doc = await setRef.get();

        const setData = { id: doc.id, ...doc.data() };
        const response = NextResponse.json(setData);
        response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
        return response;
    } catch (error: any) {
        console.error(`Error fetching set ${setId}:`, error);
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
