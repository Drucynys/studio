
import { NextResponse } from 'next/server';
import axios from 'axios';
import admin from 'firebase-admin';

// Re-initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

const POKEMON_TCG_API_BASE = 'https://api.pokemontcg.io/v2/cards';
const PAGE_SIZE = 250; // Max page size allowed by the API
const BATCH_SIZE = 450; // Firestore batch writes are limited to 500 operations

const convertCardNumberToInt = (cardNumber: string): number => {
    if (!cardNumber) return 999;
    // Extracts the leading number from strings like "swsh12-186" or "TG05/TG30"
    const match = cardNumber.match(/^\D*(\d+)/);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    // Fallback for purely numeric strings or other cases
    const numericPart = parseInt(cardNumber, 10);
    return isNaN(numericPart) ? 999 : numericPart;
};

export async function POST(request: Request) {
    const logs: string[] = [];
    try {
        const { setId } = await request.json();
        if (!setId) {
            throw new Error("A 'setId' must be provided in the request body.");
        }
        logs.push(`- Starting sync for set ID: ${setId} -`);
        logs.push("✅ Firebase Admin SDK initialized.");

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
                const response = await axios.get(POKEMON_TCG_API_BASE, {
                    headers: { 'X-Api-Key': apiKey },
                    params: { q: `set.id:${setId}`, page: page, pageSize: PAGE_SIZE, orderBy: 'number' },
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
                 hasMore = false; // Stop trying to fetch more pages for this failed set
            }
        }
        
        if (allCardsForSet.length === 0) {
             logs.push(`⚠️ No cards found from API for set ${setId}. This might be normal.`);
             return NextResponse.json({ status: 'success', count: 0, logs });
        }
        logs.push(`✅ Finished fetching. Total cards found for set: ${allCardsForSet.length}.`);

        logs.push(`Writing ${allCardsForSet.length} cards to Firestore (excluding prices)...`);
        const cardsCollection = db.collection('pokemon-tcg-cards');
        const batchPromises: Promise<any>[] = [];

        for (let i = 0; i < allCardsForSet.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const chunk = allCardsForSet.slice(i, i + BATCH_SIZE);
            chunk.forEach(card => {
                if (card && card.id) {
                    const docRef = cardsCollection.doc(card.id);
                    // Create a copy of the card and remove pricing data before saving
                    const cardToSave = { ...card };
                    delete cardToSave.tcgplayer;
                    delete cardToSave.cardmarket;
                    
                    // Add the new field for numeric sorting
                    cardToSave.numberAsInt = convertCardNumberToInt(card.number);

                    batch.set(docRef, cardToSave);
                }
            });
            batchPromises.push(batch.commit());
        }
        
        await Promise.all(batchPromises);
        logs.push(`✅ Successfully synced ${allCardsForSet.length} cards for set '${setId}' to Firestore.`);

        return NextResponse.json({ status: 'success', count: allCardsForSet.length, logs });

    } catch (error: any) {
        console.error('Error during single set card sync:', error);
        const errorMessage = error.message || 'An unknown error occurred on the server.';
        logs.push(`❌ FATAL ERROR: ${errorMessage}`);
        return NextResponse.json({ status: 'error', message: errorMessage, logs }, { status: 500 });
    }
}
