import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// This function ensures that the Firebase Admin SDK is initialized only once.
function initializeFirebaseAdmin() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  // Ensure the environment variable is parsed correctly
  let serviceAccount;
  try {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set.');
    }
    serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  } catch (e: any) {
    console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', e.message);
    throw new Error('Invalid format for GOOGLE_APPLICATION_CREDENTIALS_JSON.');
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

const firebaseAdminApp = initializeFirebaseAdmin();

export function getFirebaseAdmin() {
  return firebaseAdminApp;
}

export const db = getFirestore(firebaseAdminApp);
export const auth = getAuth(firebaseAdminApp);
export { FieldValue, Timestamp };
