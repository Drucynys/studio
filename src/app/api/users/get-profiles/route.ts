
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) { return; }
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!serviceAccountJson) {
        throw new Error("Firebase credentials are not set in environment variables.");
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export async function POST(request: Request) {
    try {
        initializeFirebaseAdmin();
        const db = getFirestore();

        // 1. Authenticate the current user making the request
        const authorization = request.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split("Bearer ")[1];
        await getAuth().verifyIdToken(idToken);

        // 2. Get the list of UIDs from the request body
        const { uids } = await request.json();
        if (!Array.isArray(uids) || uids.length === 0) {
            return NextResponse.json([]);
        }

        // 3. Fetch user profiles from Firestore, handling more than 30 UIDs by chunking
        const MAX_UIDS_PER_QUERY = 30;
        const uidChunks: string[][] = [];
        for (let i = 0; i < uids.length; i += MAX_UIDS_PER_QUERY) {
            uidChunks.push(uids.slice(i, i + MAX_UIDS_PER_QUERY));
        }

        const profilePromises = uidChunks.map(chunk =>
            db.collection('users').where('uid', 'in', chunk).get()
        );
        
        const snapshotResults = await Promise.all(profilePromises);

        const profiles: { uid: string, displayName: string }[] = [];
        snapshotResults.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                profiles.push({
                    uid: data.uid,
                    displayName: data.displayName || 'Unknown User',
                });
            });
        });
        
        return NextResponse.json(profiles);

    } catch (error: any) {
        console.error(`Error in /api/users/get-profiles:`, error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
