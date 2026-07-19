const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
// Parse multi-line GOOGLE_APPLICATION_CREDENTIALS_JSON
const start = envLocal.indexOf("GOOGLE_APPLICATION_CREDENTIALS_JSON='") + "GOOGLE_APPLICATION_CREDENTIALS_JSON='".length;
const end = envLocal.indexOf("'", start);
const jsonString = envLocal.substring(start, end);

const sa = JSON.parse(jsonString);
initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function check() {
  const sets = await db.collection('pokemon-tcg-sets').get();
  sets.forEach(doc => {
    const id = doc.id.toLowerCase();
    if (id.includes('p-a') || id.includes('a3') || id.includes('pocket') || id.includes('tcgp') || id.includes('a1') || id.includes('a2') || id.includes('a4') || id.includes('b1') || id.includes('b2')) {
      console.log("Found matching set doc id:", doc.id);
    }
  });
}
check().catch(console.error);
