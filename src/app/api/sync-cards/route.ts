
import { NextResponse } from 'next/server';
import axios from 'axios';
import { getFirebaseAdmin } from '@/lib/firebase-admin'; // Use the singleton instance

const db = getFirebaseAdmin().firestore();

const POKEMON_TCG_API_BASE = 'https://api.pokemontcg.io/v2/cards';
const PAGE_SIZE = 250; // Max page size allowed by the API
const BATCH_SIZE = 400; // Reduced for a safer margin below the 500 limit

const convertCardNumberToInt = (cardNumber: string): number => {
    if (!cardNumber) return 999;
    const match = cardNumber.match(/^\D*(\d+)/);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    const numericPart = parseInt(cardNumber, 10);
    return isNaN(numericPart) ? 999 : numericPart;
};

const isValidDocId = (id: string): boolean => {
    if (!id || id.includes('/') || id === '.' || id === '..') {
        return false;
    }
    return true;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
    const logs: string[] = [];
    try {
        const { setId } = await request.json();
        if (!setId) {
            throw new Error("A 'setId' must be provided in the request body.");
        }
        logs.push(`- Starting sync for set ID: ${setId} -`);
        logs.push("✅ Firebase Admin SDK initialized via singleton.");

        const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
        if (!apiKey) throw new Error("Pokémon TCG API key is missing.");
        logs.push("✅ Pokémon TCG API key found.");

        let allCardsForSet: any[] = [];
        let page = 1;
        let hasMore = true;
        let apiTotalCount = 0;

        logs.push(`Fetching all cards for set '${setId}' from API...`);

        while (hasMore) {
            try {
                if (page > 1) await sleep(500);
                const response = await axios.get(POKEMON_TCG_API_BASE, {
                    headers: { 'X-Api-Key': apiKey },
                    params: { q: `set.id:${setId}`, page, pageSize: PAGE_SIZE, orderBy: 'number' },
                });
                
                const { data, totalCount } = response.data;
                if (apiTotalCount === 0) apiTotalCount = totalCount;

                if (!data || data.length === 0) {
                    hasMore = false;
                    continue;
                }
                
                allCardsForSet = allCardsForSet.concat(data);
                logs.push(`Fetched page ${page}. ${allCardsForSet.length} of ${apiTotalCount} cards for this set.`);
                
                if (allCardsForSet.length >= apiTotalCount) {
                    hasMore = false;
                } else {
                    page++;
                }
            } catch (apiError: any) {
                 let errorMessage = 'An unknown error occurred while fetching from API.';
                 if (axios.isAxiosError(apiError) && apiError.response) {
                     errorMessage = `API Error: ${apiError.response.status} ${apiError.response.statusText}. The set ID '${setId}' may be invalid or the API may be temporarily down.`;
                 } else if (apiError instanceof Error) {
                     errorMessage = apiError.message;
                 }
                 logs.push(`❌ Could not fetch cards for set ${setId}. ${errorMessage}. Skipping this set.`);
                 return NextResponse.json({ status: 'error', count: 0, logs, message: errorMessage });
            }
        }
        
        if (allCardsForSet.length === 0) {
             logs.push(`⚠️ No cards found from API for set ${setId}. This might be normal for some sets.`);
             return NextResponse.json({ status: 'success', count: 0, logs });
        }
        logs.push(`✅ Finished fetching. Total cards found for set: ${allCardsForSet.length}.`);

        logs.push(`Writing ${allCardsForSet.length} cards to Firestore (excluding prices)...`);
        const cardsCollection = db.collection('pokemon-tcg-cards');
        let successfulWrites = 0;

        for (let i = 0; i < allCardsForSet.length; i += BATCH_SIZE) {
            const chunk = allCardsForSet.slice(i, i + BATCH_SIZE);
            const batch = db.batch();
            let processedInChunk = 0;
            
            chunk.forEach(card => {
                if (card && card.id && isValidDocId(card.id)) {
                    const docRef = cardsCollection.doc(card.id);
                    const cardToSave = { ...card };
                    delete cardToSave.tcgplayer;
                    delete cardToSave.cardmarket;
                    cardToSave.numberAsInt = convertCardNumberToInt(card.number);
                    batch.set(docRef, cardToSave);
                    processedInChunk++;
                } else {
                    logs.push(`- Skipped card with invalid ID: ${card.id || 'N/A'}`);
                }
            });

            if (processedInChunk > 0) {
                try {
                    await batch.commit();
                    successfulWrites += processedInChunk;
                    logs.push(`- Batch ${Math.floor(i / BATCH_SIZE) + 1} succeeded. Wrote ${processedInChunk} cards.`);
                    await sleep(100); // Add a small delay between batches
                } catch (batchError: any) {
                    logs.push(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${batchError.message}`);
                }
            }
        }
        
        logs.push(`✅ Successfully synced ${successfulWrites} of ${allCardsForSet.length} cards for set '${setId}' to Firestore.`);

        return NextResponse.json({ status: 'success', count: successfulWrites, logs });

    } catch (error: any) {
        console.error('Error during single set card sync:', error);
        const errorMessage = error.message || 'An unknown error occurred on the server.';
        logs.push(`❌ FATAL ERROR: ${errorMessage}`);
        return NextResponse.json({ status: 'error', message: errorMessage, logs, count: 0 }, { status: 500 });
    }
}
