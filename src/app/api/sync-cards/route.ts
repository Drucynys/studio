
import { NextResponse } from 'next/server';
import axios from 'axios';
import { dbAdmin } from '@/lib/firebase-admin';

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
        }
        
        if (allCardsForSet.length === 0) {
             logs.push(`⚠️ No cards found from API for set ${setId}. This might be normal.`);
             return NextResponse.json({ status: 'success', count: 0, logs });
        }
        logs.push(`✅ Finished fetching. Total cards found for set: ${allCardsForSet.length}.`);

        logs.push(`Writing ${allCardsForSet.length} cards to Firestore (excluding prices)...`);
        const cardsCollection = dbAdmin.collection('pokemon-tcg-cards');
        const batchPromises: Promise<any>[] = [];

        for (let i = 0; i < allCardsForSet.length; i += BATCH_SIZE) {
            const batch = dbAdmin.batch();
            const chunk = allCardsForSet.slice(i, i + BATCH_SIZE);
            chunk.forEach(card => {
                if (card && card.id) {
                    const docRef = cardsCollection.doc(card.id);
                    // Create a copy of the card and remove pricing data before saving
                    const cardToSave = { ...card };
                    delete cardToSave.tcgplayer;
                    delete cardToSave.cardmarket;
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
