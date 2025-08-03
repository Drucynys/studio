// src/lib/firebase-admin.ts
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/**
 * A centralized, safe function to initialize the Firebase Admin SDK.
 * It ensures that the SDK is initialized only once, which is crucial in a serverless environment.
 */
function initializeFirebaseAdmin() {
    // Check if the app is already initialized to prevent errors
    if (admin.apps.length > 0) {
        return admin.app();
    }

    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!serviceAccountJson || !projectId) {
        throw new Error("Firebase credentials or Project ID are not set in environment variables.");
    }
    
    // The service account JSON from Secret Manager often comes with escaped newlines.
    // We need to replace them with actual newlines for the SDK to parse it correctly.
    const serviceAccountString = serviceAccountJson.replace(/\\n/g, '\n');
    const serviceAccount = JSON.parse(serviceAccountString);
    
    // Initialize the app with the credentials
    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
    });
}

// Initialize the app and export the necessary services.
// This ensures that initialization happens only once when this module is first imported.
initializeFirebaseAdmin();

const dbAdmin = getFirestore();
const authAdmin = getAuth();

export { dbAdmin, authAdmin };
