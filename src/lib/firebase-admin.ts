
import admin from 'firebase-admin';

// This function ensures that the Firebase Admin SDK is initialized only once.
function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return admin.apps[0] as admin.app.App;
    }

    // Ensure the environment variable is parsed correctly
    let serviceAccount;
    try {
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
            throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set.');
        }
        serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    } catch (e: any) {
        console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:", e.message);
        throw new Error("Invalid format for GOOGLE_APPLICATION_CREDENTIALS_JSON.");
    }
    
    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const firebaseAdminApp = initializeFirebaseAdmin();

export function getFirebaseAdmin() {
    return firebaseAdminApp;
}
