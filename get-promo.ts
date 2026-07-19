import { db } from './src/lib/firebase-admin';
async function run() {
  const q = await db.collection('pokemon-tcg-cards').where('setId', '==', 'en-bwp').limit(10).get();
  q.forEach(doc => {
    const d = doc.data();
    console.log(d.name, d.image, d.images);
  });
}
run();
