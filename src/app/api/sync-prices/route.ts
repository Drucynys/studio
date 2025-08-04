
import { NextResponse } from 'next/server';
import axios from 'axios';
import { dbAdmin } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

const POKEMON_TCG_API_BASE = 'https://api.pokemontcg.io/v2/cards';
const PAGE_SIZE = 250; // Max page size allowed by the API
const BATCH_SIZE = 450; // Firestore batch writes are limited to 500 operations

export async function POST(request: Request) {
    const logs: string[] = [];
    try {
        const { setId } = await request.json();
        if (!setId) {
            throw new Error("A 'setId' must be provided in the request body.");
        }
        logs.push(`- Starting price update for set ID: ${setId} -`);
        logs.push("✅ Firebase Admin SDK initialized.");

        const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
        if (!apiKey) {
            logs.push("❌ FATAL: Pokémon TCG API key is missing from environment variables.");
            throw new Error("Pokémon TCG API key is missing.");
        }
        logs.push(`✅ Pokémon TCG API key found.`);

        let allCardsForSet: any[] = [];
        let page = 1;
        let hasMore = true;
        let apiTotalCount = 0;

        logs.push(`Fetching all cards for set '${setId}' from API to get price data...`);

        while (hasMore) {
            try {
                const response = await axios.get(POKEMON_TCG_API_BASE, {
                    headers: { 'X-Api-Key': apiKey },
                    params: { q: `set.id:${setId}`, page: page, pageSize: PAGE_SIZE },
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
                 logs.push(`❌ Could not fetch cards for set ${setId}. ${errorMessage}`);
                 hasMore = false; // Stop trying to fetch more pages for this failed set
            }
        }
        
        if (allCardsForSet.length === 0) {
             logs.push(`⚠️ No cards found from API for set ${setId}. No prices to update.`);
             return NextResponse.json({ status: 'success', count: 0, logs });
        }
        logs.push(`✅ Finished fetching. Found ${allCardsForSet.length} cards with price data.`);

        logs.push(`Updating prices for ${allCardsForSet.length} cards in Firestore...`);
        const cardsCollection = dbAdmin.collection('pokemon-tcg-cards');
        const historyCollection = dbAdmin.collection('priceHistory');
        const batchPromises: Promise<any>[] = [];

        for (let i = 0; i < allCardsForSet.length; i += BATCH_SIZE) {
            const batch = dbAdmin.batch();
            const chunk = allCardsForSet.slice(i, i + BATCH_SIZE);
            chunk.forEach(card => {
                if (card && card.id && card.tcgplayer?.prices) { // Added check for prices
                    const docRef = cardsCollection.doc(card.id);
                    const priceData = {
                        tcgplayer: card.tcgplayer || null,
                    };
                    // Use set with merge to update only these fields in the master card list.
                    batch.set(docRef, priceData, { merge: true });
                    
                    // Also save a snapshot to the priceHistory collection
                    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                    const historyDocRef = historyCollection.doc(`${card.id}_${today}`);
                    const historyData = {
                        cardApiId: card.id,
                        date: admin.firestore.Timestamp.now(),
                        prices: priceData,
                    };
                    batch.set(historyDocRef, historyData);
                } else {
                    logs.push(`- Skipping card ${card.id} due to missing price data.`);
                }
            });
            batchPromises.push(batch.commit());
        }
        
        await Promise.all(batchPromises);
        logs.push(`✅ Successfully updated prices and saved history for applicable cards in set '${setId}'.`);

        return NextResponse.json({ status: 'success', count: allCardsForSet.length, logs });

    } catch (error: any) {
        let errorMessage = 'An unknown error occurred on the server.';
        if (axios.isAxiosError(error) && error.response) {
            errorMessage = `API Error: ${error.response.status} ${error.response.statusText}. Response: ${JSON.stringify(error.response.data)}`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        console.error('Error during price update sync:', errorMessage);
        logs.push(`❌ FATAL ERROR: ${errorMessage}`);
        return NextResponse.json({ status: 'error', message: errorMessage, logs }, { status: 500 });
    }
}
