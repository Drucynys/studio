import { NextResponse } from 'next/server';
import axios from 'axios';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

const db = getFirebaseAdmin().firestore();
const POKEMON_TCG_API_BASE = 'https://api.pokemontcg.io/v2/cards';
const PAGE_SIZE = 100;
const BATCH_SIZE = 400; // Safer margin (limit is 500)

/**
 * Validates that a string is a safe Firestore document ID
 */
const isValidDocId = (id: string): boolean => {
    return !!id && !id.includes('/') && id !== '.' && id !== '..';
};

/**
 * Normalizes card numbers for consistent sorting
 */
const convertCardNumberToInt = (cardNumber: string): number => {
    if (!cardNumber) return 999;
    const match = cardNumber.match(/^\D*(\d+)/);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    const numericPart = parseInt(cardNumber, 10);
    return isNaN(numericPart) ? 999 : numericPart;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
    const logs: string[] = [];
    try {
        const body = await request.json().catch(() => ({}));
        const { setId } = body;
        
        if (!setId) {
            return NextResponse.json({ status: 'error', message: "Missing setId", logs });
        }

        const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ status: 'error', message: "API Key missing from environment", logs });
        }

        logs.push(`- Starting resilient sync for set: ${setId} -`);

        let allCards: any[] = [];
        let page = 1;
        let hasMore = true;
        let totalCountFromApi = 0;

        // --- PHASE 1: FETCH DATA ---
        while (hasMore && page <= 50) { // Safety cap of 5000 cards per set
            try {
                if (page > 1) await sleep(1000); // Wait 1s between pages

                const response = await axios.get(POKEMON_TCG_API_BASE, {
                    timeout: 50000,
                    headers: { 'X-Api-Key': apiKey },
                    params: { q: `set.id:${setId}`, page, pageSize: PAGE_SIZE, orderBy: 'number' },
                });
                
                const { data, totalCount } = response.data;
                if (page === 1) totalCountFromApi = totalCount || 0;
                
                if (!data || data.length === 0) break;
                
                allCards = allCards.concat(data);
                
                if (allCards.length >= totalCountFromApi || data.length < PAGE_SIZE) {
                    hasMore = false;
                } else {
                    page++;
                }
            } catch (apiError: any) {
                const msg = apiError.response?.status === 429 ? "Rate limited by TCG API" : apiError.message;
                return NextResponse.json({ status: 'error', message: `API Error: ${msg}`, logs });
            }
        }

        if (allCards.length === 0) {
            return NextResponse.json({ status: 'success', count: 0, logs: [...logs, "⚠️ No cards found for this set."] });
        }

        // --- PHASE 2: SAVE DATA IN RESILIENT BATCHES ---
        const cardsCollection = db.collection('pokemon-tcg-cards');
        let totalProcessed = 0;
        let failedBatches = 0;

        for (let i = 0; i < allCards.length; i += BATCH_SIZE) {
            const chunk = allCards.slice(i, i + BATCH_SIZE);
            const batch = db.batch();
            let validInBatch = 0;
            
            chunk.forEach(card => {
                if (card?.id && isValidDocId(card.id)) {
                    const docRef = cardsCollection.doc(card.id);
                    const cardToSave = { ...card };
                    
                    // Cleanup nested objects that might contain incompatible data
                    delete cardToSave.tcgplayer;
                    delete cardToSave.cardmarket;
                    
                    // Add helpful metadata
                    cardToSave.numberAsInt = convertCardNumberToInt(card.number);
                    cardToSave.lastUpdated = new Date().toISOString();
                    
                    batch.set(docRef, cardToSave, { merge: true });
                    validInBatch++;
                }
            });

            if (validInBatch > 0) {
                try {
                    await batch.commit();
                    totalProcessed += validInBatch;
                    await sleep(200); // Throttling: 200ms pause between batches
                } catch (dbError: any) {
                    failedBatches++;
                    console.error(`Batch commit failed for set ${setId}:`, dbError.message);
                }
            }
        }
        
        const summary = `✅ Processed ${totalProcessed}/${allCards.length} cards.`;
        if (failedBatches > 0) {
            logs.push(`⚠️ Warning: ${failedBatches} batch(es) failed to write.`);
        }

        return NextResponse.json({ 
            status: 'success', 
            count: totalProcessed, 
            logs: [...logs, summary] 
        });

    } catch (error: any) {
        console.error('Fatal error in sync-cards route:', error);
        return NextResponse.json({ 
            status: 'error', 
            message: error.message || 'Fatal server error', 
            logs 
        });
    }
}
