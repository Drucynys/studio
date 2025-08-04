
// src/app/api/users/follow/route.ts
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Re-initialize Firebase Admin SDK and Auth if not already initialized
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const authAdmin = admin.auth();
const dbAdmin = admin.firestore();

export async function POST(request: Request) {
    console.log('[API] /api/users/follow endpoint hit.');
    try {
        // 1. Authenticate the current user making the request
        const authorization = request.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            console.error('[API] Unauthorized: Missing or invalid Authorization header.');
            return NextResponse.json({ message: 'Unauthorized: No token provided.' }, { status: 401 });
        }
        const idToken = authorization.split("Bearer ")[1];
        
        let decodedToken;
        try {
            decodedToken = await authAdmin.verifyIdToken(idToken);
        } catch (error) {
            console.error('[API] Unauthorized: Invalid token.', error);
            return NextResponse.json({ message: 'Unauthorized: Invalid token.' }, { status: 401 });
        }
        
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
        const currentUserFollowingRef = dbAdmin.collection('users').doc(currentUserId).collection('following').doc(targetUserId);
        const targetUserFollowersRef = dbAdmin.collection('users').doc(targetUserId).collection('followers').doc(currentUserId);
        
        const batch = dbAdmin.batch();

        if (action === 'follow') {
            console.log('[API] Batch: Following user.');
            const timestamp = new Date();
            batch.set(currentUserFollowingRef, { uid: targetUserId, followedAt: timestamp });
            batch.set(targetUserFollowersRef, { uid: currentUserId, followedAt: timestamp });
        } else { // 'unfollow'
            console.log('[API] Batch: Unfollowing user.');
            batch.delete(currentUserFollowingRef);
            batch.delete(targetUserFollowersRef);
        }

        await batch.commit();
        console.log('[API] Database batch write successful.');

        return NextResponse.json({ status: 'success', message: `Successfully ${action}ed user.` });

    } catch (error: any) {
        console.error(`[API] FATAL Error in /api/users/follow:`, error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
