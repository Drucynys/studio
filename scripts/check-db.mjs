import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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

async function checkDatabase() {
  console.log('Checking Firestore database connection...');
  const collections = [
    'pokemon-tcg-sets',
    'pokemon-tcg-cards',
    'users',
    'exchange',
    'priceHistory',
    'pokedex',
  ];

  for (const colName of collections) {
    try {
      const snap = await db.collection(colName).limit(1).get();
      let count = 'unknown';
      try {
        const countSnap = await db.collection(colName).count().get();
        count = countSnap.data().count;
      } catch (countErr) {
        // Fallback
        const allSnap = await db.collection(colName).select().get();
        count = allSnap.size;
      }

      console.log(`Collection [${colName}]: ${count} documents`);
      if (snap.size > 0) {
        console.log(`  - Example document ID: ${snap.docs[0].id}`);
      }
    } catch (err) {
      console.error(`Error querying [${colName}]:`, err.message);
    }
  }
}

checkDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
