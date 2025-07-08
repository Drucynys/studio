
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return;
    }
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!serviceAccountJson || !projectId) {
        throw new Error("Firebase credentials or Project ID are not set in environment variables.");
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

export async function GET(request: Request, { params }: { params: { cardApiId: string } }) {
    const { cardApiId } = params;
    if (!cardApiId) {
        return NextResponse.json({ message: 'Card API ID is required' }, { status: 400 });
    }

    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        const historyRef = db.collection('priceHistory');
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoTimestamp = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);

        const querySnapshot = await historyRef
            .where('cardApiId', '==', cardApiId)
            .where('date', '>=', thirtyDaysAgoTimestamp)
            .orderBy('date', 'asc')
            .get();

        if (querySnapshot.empty) {
            return NextResponse.json([]);
        }

        const history = querySnapshot.docs.map(doc => {
            const data = doc.data();
            // Convert Firestore Timestamp to a more client-friendly format
            if (data.date && data.date.toDate) {
                data.date = data.date.toDate().toISOString().split('T')[0];
            }
            return data;
        });
        
        return NextResponse.json(history);
    } catch (error: any) {
        console.error(`Error fetching price history for ${cardApiId}:`, error);
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
