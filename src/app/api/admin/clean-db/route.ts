import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const sets = await db.collection('pokemon-tcg-sets').get();
    let setsDeleted = 0;
    const setBatch = db.batch();
    for (const doc of sets.docs) {
      if (!doc.data().language) {
        setBatch.delete(doc.ref);
        setsDeleted++;
      }
    }
    await setBatch.commit();

    const cards = await db.collection('pokemon-tcg-cards').select('language').get();
    let cardsDeleted = 0;
    let batch = db.batch();
    for (let i = 0; i < cards.docs.length; i++) {
      if (cardsDeleted >= 4000) break;
      const doc = cards.docs[i];
      if (!doc.data().language) {
        batch.delete(doc.ref);
        cardsDeleted++;
        if (cardsDeleted % 400 === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }
    }
    if (cardsDeleted % 400 !== 0) {
      await batch.commit();
    }

    return NextResponse.json({
      message: `Cleaned up ${setsDeleted} legacy sets and ${cardsDeleted} legacy cards.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
