const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const match = envLocal.match(/GOOGLE_APPLICATION_CREDENTIALS_JSON='([\s\S]*?)'/);
const sa = JSON.parse(match[1]);

initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function run() {
  const sets = await db.collection('pokemon-tcg-sets').get();
  const pocketDocs = [];
  sets.forEach(doc => {
    const id = doc.id.toLowerCase();
    const data = doc.data();
    const series = (data.serie?.name || data.series || '').toLowerCase();
    const logo = (data.logo || '').toLowerCase();
    
    if (id === 'a1' || id.endsWith('-a1') || id === 'a1a' || id.endsWith('-a1a') || id === 'a2' || id.endsWith('-a2') || id === 'a3' || id.endsWith('-a3') || id === 'a4' || id.endsWith('-a4') || id === 'p-a' || id.endsWith('-p-a') || id === 'b1' || id.endsWith('-b1') || id === 'b2' || id.endsWith('-b2') || id.includes('tcgp') || logo.includes('/tcgp/') || series.includes('pocket')) {
      pocketDocs.push(doc);
    }
  });

  console.log("Found", pocketDocs.length, "sets to nuke.");
  
  let deletedCards = 0;
  for (const setDoc of pocketDocs) {
    const docId = setDoc.id;
    const origId = setDoc.data().id;
    
    const c1 = await db.collection('pokemon-tcg-cards').where('setId', '==', docId).get();
    const c2 = await db.collection('pokemon-tcg-cards').where('setId', '==', origId).get();
    const all = new Map();
    c1.docs.forEach(d => all.set(d.id, d));
    c2.docs.forEach(d => all.set(d.id, d));
    
    const cards = Array.from(all.values());
    console.log(`Set ${docId} has ${cards.length} cards.`);
    
    if (cards.length > 0) {
      const batch = db.batch();
      cards.forEach(c => batch.delete(c.ref));
      await batch.commit();
      deletedCards += cards.length;
    }
    await setDoc.ref.delete();
  }
  
  console.log(`Deleted ${deletedCards} cards.`);
}
run().catch(console.error);
