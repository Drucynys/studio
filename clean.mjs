import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  console.log("Starting DB Cleanup for Pocket cards...");
  const setsCollection = db.collection('pokemon-tcg-sets');
  const cardsCollection = db.collection('pokemon-tcg-cards');

  const setsSnapshot = await setsCollection.get();
  const pocketSets = [];
  
  setsSnapshot.forEach((doc) => {
    const data = doc.data();
    const seriesName = (data.serie?.name || data.series || '').toLowerCase();
    const setId = (doc.id || '').toLowerCase();
    const logo = (data.logo || '').toLowerCase();
    const symbol = (data.symbol || '').toLowerCase();

    if (
      seriesName.includes('pocket') || 
      seriesName.includes('tcgp') || 
      setId === 'tcgp' ||
      logo.includes('/tcgp/') ||
      symbol.includes('/tcgp/') ||
      setId.includes('-a1') || 
      setId.includes('-a2') || 
      setId.includes('-a3') || 
      setId.includes('-a4') || 
      setId.includes('-p-a') ||
      setId.includes('-b1') ||
      setId.includes('-b2')
    ) {
      pocketSets.push({ id: doc.id, ref: doc.ref, data });
    }
  });

  console.log(`Found ${pocketSets.length} Pocket sets to delete.`);
  for (const set of pocketSets) {
    console.log(`- ${set.data.name} (${set.id})`);
  }

  let deletedCardsCount = 0;
  for (const set of pocketSets) {
    const originalId = set.data.id; 
    const language = set.data.language || 'en';
    
    const cardsQuery = await cardsCollection.where('setId', '==', originalId).get();
    console.log(`Set ${originalId} has ${cardsQuery.size} cards.`);
    
    if (!cardsQuery.empty) {
      const batch = db.batch();
      let batchCount = 0;
      for (const doc of cardsQuery.docs) {
        if (doc.data().language === language || !doc.data().language) {
          batch.delete(doc.ref);
          batchCount++;
          deletedCardsCount++;
        }
        
        if (batchCount === 490) {
          await batch.commit();
          batchCount = 0;
        }
      }
      if (batchCount > 0) {
        await batch.commit();
      }
    }
    
    await set.ref.delete();
  }

  console.log(`Deleted a total of ${deletedCardsCount} Pocket cards.`);
  console.log("Cleanup complete!");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
