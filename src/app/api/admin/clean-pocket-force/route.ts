import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs: string[] = [];
    const setsCollection = db.collection('pokemon-tcg-sets');
    const cardsCollection = db.collection('pokemon-tcg-cards');

    // 1. Find all sets that are Pocket sets
    const setsSnapshot = await setsCollection.get();
    const pocketSets: any[] = [];
    const pocketSetDocs: any[] = [];

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
        setId === 'a1' || setId.endsWith('-a1') || 
        setId === 'a1a' || setId.endsWith('-a1a') ||
        setId === 'a2' || setId.endsWith('-a2') || 
        setId === 'a3' || setId.endsWith('-a3') || 
        setId === 'a4' || setId.endsWith('-a4') || 
        setId === 'p-a' || setId.endsWith('-p-a') ||
        setId === 'b1' || setId.endsWith('-b1') ||
        setId === 'b2' || setId.endsWith('-b2')
      ) {
        pocketSets.push(data);
        pocketSetDocs.push(doc);
      }
    });

    logs.push(`Found ${pocketSetDocs.length} Pocket sets to delete.`);

    // 2. Find all cards that belong to these sets
    let deletedCardsCount = 0;
    
    // We can't do a single query for all sets if there are many, but since there are maybe 20 Pocket sets,
    // we can either query by setId or just iterate. Iterating might be safer if we want to catch all variants.
    // Or we can just get all cards and filter in memory since we did that for Pokedex.
    
    // Wait, getting all 30k cards in memory might exceed Next.js memory limit. Let's do batch queries.
    for (const setDoc of pocketSetDocs) {
      const originalId = setDoc.data().id; // e.g. "A1"
      const docId = setDoc.id; // e.g. "en-A1" or "en-a1"
      const language = setDoc.data().language || 'en';
      
      // sync-cards saves cards with setId = the ORIGINAL ID (e.g. "A1") 
      // wait, no, sync-cards saves with `cardToSave.setId = setId` which is passed from frontend 
      // where frontend passes the document ID (`set.id` from `api/sets` which is `doc.id`). 
      // Let's query both just to be safe.
      const cardsQueryDocId = await cardsCollection.where('setId', '==', docId).get();
      const cardsQueryOrigId = await cardsCollection.where('setId', '==', originalId).get();
      const allCardsMap = new Map();
      cardsQueryDocId.docs.forEach(d => allCardsMap.set(d.id, d));
      cardsQueryOrigId.docs.forEach(d => allCardsMap.set(d.id, d));
      const allCards = Array.from(allCardsMap.values());
      
      logs.push(`Set ${docId} has ${allCards.length} cards.`);
      
      if (allCards.length > 0) {
        const batch = db.batch();
        let batchCount = 0;
        for (const doc of allCards) {
          // If language matches or we don't care, delete it. Let's just delete all with this API setId
          // just to be sure. Or maybe check language?
          // Since the API setId is unique enough (like 'A1'), we can just delete them.
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
      
      // Delete the set itself
      await setDoc.ref.delete();
    }

    logs.push(`Deleted a total of ${deletedCardsCount} Pocket cards.`);
    logs.push(`Timestamp: ${new Date().toISOString()}`);

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Error in clean-pocket route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
