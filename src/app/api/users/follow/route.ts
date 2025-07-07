// src/app/api/users/follow/route.ts
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

        // 3. Use a transaction to perform the follow/unfollow and update counts
        const currentUserRef = db.collection('users').doc(currentUserId);
        const targetUserRef = db.collection('users').doc(targetUserId);

        await db.runTransaction(async (transaction) => {
            const targetUserDoc = await transaction.get(targetUserRef);
            if (!targetUserDoc.exists) {
                throw new Error("User to follow does not exist.");
            }

            const currentUserFollowingRef = currentUserRef.collection('following').doc(targetUserId);
            const targetUserFollowersRef = targetUserRef.collection('followers').doc(currentUserId);

            if (action === 'follow') {
                console.log('[API] Transaction: Following user.');
                const timestamp = new Date();
                transaction.set(currentUserFollowingRef, { uid: targetUserId, followedAt: timestamp });
                transaction.set(targetUserFollowersRef, { uid: currentUserId, followedAt: timestamp });
                
                // Increment counts
                transaction.update(currentUserRef, { followingCount: FieldValue.increment(1) });
                transaction.update(targetUserRef, { followersCount: FieldValue.increment(1) });
                console.log('[API] Transaction: Incremented followingCount for current user and followersCount for target user.');

            } else { // 'unfollow'
                console.log('[API] Transaction: Unfollowing user.');
                transaction.delete(currentUserFollowingRef);
                transaction.delete(targetUserFollowersRef);
                
                // Decrement counts
                transaction.update(currentUserRef, { followingCount: FieldValue.increment(-1) });
                transaction.update(targetUserRef, { followersCount: FieldValue.increment(-1) });
                console.log('[API] Transaction: Decremented followingCount for current user and followersCount for target user.');
            }
        });

        console.log('[API] Database transaction successful.');

        return NextResponse.json({ status: 'success', message: `Successfully ${action}ed user.` });

    } catch (error: any) {
        console.error(`[API] FATAL Error in /api/users/follow:`, error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
