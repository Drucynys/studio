
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
        
        // This query is simpler and avoids the need for a composite index.
        // We will filter and sort the data in the backend after fetching.
        const querySnapshot = await historyRef
            .where('cardApiId', '==', cardApiId)
            .get();

        if (querySnapshot.empty) {
            return NextResponse.json([]);
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const history = querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                // Keep the JS Date object for sorting and filtering
                return { ...data, jsDate: data.date.toDate() };
            })
            .filter(entry => entry.jsDate >= thirtyDaysAgo) // Filter for the last 30 days
            .sort((a, b) => a.jsDate.getTime() - b.jsDate.getTime()) // Sort by date ascending
            .map(entry => {
                // Now format the date for the client, removing the temporary jsDate field
                const { jsDate, ...rest } = entry;
                return {
                    ...rest,
                    date: entry.jsDate.toISOString().split('T')[0],
                };
            });

        return NextResponse.json(history);
    } catch (error: any) {
        console.error(`Error fetching price history for ${cardApiId}:`, error);
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
