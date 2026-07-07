import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  const regex = /^\s*([a-zA-Z0-9_]+)\s*=\s*(["']?)([\s\S]*?)\2\s*$/gm;
  let match;
  while ((match = regex.exec(envConfig)) !== null) {
    const key = match[1];
    const value = match[3];
    process.env[key] = value;
  }
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  console.error('Error: GOOGLE_APPLICATION_CREDENTIALS_JSON is not defined in .env.local');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();
const auth = getAuth();

// Recursive helper to delete document and all its subcollections
async function deleteDocumentAndSubcollections(docRef) {
  const collections = await docRef.listCollections();
  for (const collection of collections) {
    const querySnapshot = await collection.get();
    for (const doc of querySnapshot.docs) {
      await deleteDocumentAndSubcollections(doc.ref);
    }
  }
  await docRef.delete();
}

async function clearUsers() {
  console.log('--- Step 1: Deleting Firestore Users & Subcollections ---');
  const usersCollection = db.collection('users');
  const usersSnap = await usersCollection.get();
  
  if (usersSnap.empty) {
    console.log('No user profiles found in Firestore.');
  } else {
    for (const doc of usersSnap.docs) {
      console.log(`Deleting Firestore profile and data for user: ${doc.id}`);
      await deleteDocumentAndSubcollections(doc.ref);
    }
    console.log(`Successfully deleted ${usersSnap.size} user profiles and all subcollections.`);
  }

  console.log('\n--- Step 2: Deleting Exchange Listings ---');
  const exchangeCollection = db.collection('exchange');
  const exchangeSnap = await exchangeCollection.get();
  
  if (exchangeSnap.empty) {
    console.log('No exchange listings found.');
  } else {
    for (const doc of exchangeSnap.docs) {
      console.log(`Deleting exchange listing: ${doc.id}`);
      await doc.ref.delete();
    }
    console.log(`Successfully deleted ${exchangeSnap.size} exchange listings.`);
  }

  console.log('\n--- Step 3: Deleting Firebase Auth Users ---');
  let deletedAuthCount = 0;
  let nextPageToken;
  
  do {
    const listUsersResult = await auth.listUsers(100, nextPageToken);
    const uids = listUsersResult.users.map((user) => user.uid);
    
    if (uids.length > 0) {
      console.log(`Deleting ${uids.length} users from Firebase Auth...`);
      await auth.deleteUsers(uids);
      deletedAuthCount += uids.length;
    }
    
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  console.log(`Successfully deleted ${deletedAuthCount} users from Firebase Auth.`);
}

clearUsers()
  .then(() => {
    console.log('\nUser deletion completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nFatal error occurred during user deletion:', err);
    process.exit(1);
  });
