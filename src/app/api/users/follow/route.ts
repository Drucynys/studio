// src/app/api/users/follow/route.ts
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) { return; }
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

export async function POST(request: Request) {
    console.log('[API] /api/users/follow endpoint hit.');
    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        console.log('[API] Firebase Admin initialized.');


        // 1. Authenticate the current user
        const authorization = request.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            console.error('[API] Unauthorized: Missing or invalid Authorization header.');
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split("Bearer ")[1];
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const currentUserId = decodedToken.uid;
        console.log(`[API] Authenticated user: ${currentUserId}`);

        // 2. Get target user ID from the request body
        const { targetUserId, action } = await request.json();
        console.log(`[API] Received action: '${action}' for target user: ${targetUserId}`);
        if (!targetUserId || !action || (action !== 'follow' && action !== 'unfollow')) {
            console.error('[API] Bad Request: Missing or invalid parameters.');
            return NextResponse.json({ message: 'Missing or invalid parameters: targetUserId and action are required.' }, { status: 400 });
        }

        if (currentUserId === targetUserId) {
            console.error('[API] Bad Request: User cannot follow themselves.');
            return NextResponse.json({ message: 'You cannot follow yourself.' }, { status: 400 });
        }

        // 3. Perform the follow/unfollow action using a batched write for atomicity
        const currentUserFollowingRef = db.collection('users').doc(currentUserId).collection('following').doc(targetUserId);
        const targetUserFollowersRef = db.collection('users').doc(targetUserId).collection('followers').doc(currentUserId);
        
        console.log(`[API] Preparing to write to DB for action: ${action}`);
        const batch = db.batch();

        if (action === 'follow') {
            const timestamp = new Date();
            console.log(`[API] DB WRITE: Setting document at ${currentUserFollowingRef.path}`);
            batch.set(currentUserFollowingRef, { uid: targetUserId, followedAt: timestamp });

            console.log(`[API] DB WRITE: Setting document at ${targetUserFollowersRef.path}`);
            batch.set(targetUserFollowersRef, { uid: currentUserId, followedAt: timestamp });
            console.log('[API] This should trigger the notifyOnNewFollower Cloud Function.');
        } else { // 'unfollow'
            console.log(`[API] DB DELETE: Deleting document at ${currentUserFollowingRef.path}`);
            batch.delete(currentUserFollowingRef);
            
            console.log(`[API] DB DELETE: Deleting document at ${targetUserFollowersRef.path}`);
            batch.delete(targetUserFollowersRef);
        }

        await batch.commit();
        console.log('[API] Database batch commit successful.');


        return NextResponse.json({ status: 'success', message: `Successfully ${action}ed user.` });

    } catch (error: any) {
        console.error(`[API] FATAL Error in /api/users/follow:`, error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
