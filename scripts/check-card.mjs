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

const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}
const db = getFirestore();

async function run() {
  const snap = await db.collection('pokemon-tcg-cards')
    .limit(5)
    .get();
  
  for (const doc of snap.docs) {
    const data = doc.data();
    console.log(doc.id, data.name, 'TCGPlayer:', JSON.stringify(data.tcgplayer, null, 2));
  }
}
run();
