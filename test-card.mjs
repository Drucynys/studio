import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
process.env.FIRESTORE_EMULATOR_HOST = undefined; // Ensure we connect to prod if needed
if (!getApps().length) {
  initializeApp(); // Use default credentials
}
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('pokemon-tcg-cards').limit(2000).get();
  const pocketCard = snapshot.docs.map(d => d.data()).find(c => JSON.stringify(c).toLowerCase().includes('pocket'));
  if (pocketCard) {
    console.log("FOUND POCKET CARD:", pocketCard.set);
  } else {
    console.log("No pocket card found in first 2000");
  }
}
run();
