
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

export async function GET() {
    try {
        const setsCollection = db.collection('pokemon-tcg-sets');
        const snapshot = await setsCollection.orderBy('releaseDate', 'desc').get();

        if (snapshot.empty) {
            return NextResponse.json([]);
        }

        const sets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(sets);

    } catch (error: any) {
        console.error('Error fetching sets:', error);
        return NextResponse.json(
            { message: error.message || 'An unknown server error occurred while fetching sets.' },
            { status: 500 }
        );
    }
}
