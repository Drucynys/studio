const fs = require('fs');
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();
async function run() {
  const q = await db.collection('pokemon-tcg-cards').where('setId', '==', 'en-bwp').limit(10).get();
  q.forEach(doc => {
    const d = doc.data();
    console.log(d.id, d.name, d.image, d.images);
  });
}
run();
