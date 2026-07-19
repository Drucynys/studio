import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('pokemon-tcg-sets').get();
  const sets = snapshot.docs.map(d => d.data());
  const pocketSets = sets.filter(s => JSON.stringify(s).toLowerCase().includes('pocket'));
  console.log(pocketSets.map(s => s.id + ': ' + s.name + ' (' + (s.serie?.name || s.series) + ')'));
}
run();
