
import { NextResponse } from 'next/server';
import axios from 'axios';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const POKEMON_TCG_API_BASE = 'https://api.pokemontcg.io/v2/cards';
const PAGE_SIZE = 250; // Max page size allowed by the API
const BATCH_SIZE = 450; // Firestore batch writes are limited to 500 operations

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) { return; }
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!serviceAccountJson || !projectId) {
        throw new Error("Firebase credentials or Project ID are not set in environment variables.");
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    if (serviceAccount.private_key) {
        const serviceAccount = JSON.parse(serviceAccountJson);
if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}
    }
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
    });
}

export async function POST(request: Request) {
    const logs: string[] = [];
    try {
        const { setId } = await request.json();
        if (!setId) {
            throw new Error("A 'setId' must be provided in the request body.");
        }
        logs.push(`- Starting price update for set ID: ${setId} -`);

        initializeFirebaseAdmin();
        const db = getFirestore();
        logs.push("✅ Firebase Admin SDK initialized.");

        const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
        if (!apiKey) throw new Error("Pokémon TCG API key is missing.");
        logs.push("✅ Pokémon TCG API key found.");

        let allCardsForSet: any[] = [];
        let page = 1;
        let hasMore = true;
        let apiTotalCount = 0;

        logs.push(`Fetching all cards for set '${setId}' from API to get price data...`);

        while (hasMore) {
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
        }
        
        if (allCardsForSet.length === 0) {
             logs.push(`⚠️ No cards found from API for set ${setId}. No prices to update.`);
             return NextResponse.json({ status: 'success', count: 0, logs });
        }
        logs.push(`✅ Finished fetching. Found ${allCardsForSet.length} cards with price data.`);

        logs.push(`Updating prices for ${allCardsForSet.length} cards in Firestore...`);
        const cardsCollection = db.collection('pokemon-tcg-cards');
        const historyCollection = db.collection('priceHistory');
        const batchPromises: Promise<any>[] = [];

        for (let i = 0; i < allCardsForSet.length; i += BATCH_SIZE) {
            const batch = db.batch();
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
        console.error('Error during price update sync:', error);
        const errorMessage = error.message || 'An unknown error occurred on the server.';
        logs.push(`❌ FATAL ERROR: ${errorMessage}`);
        return NextResponse.json({ status: 'error', message: errorMessage, logs }, { status: 500 });
    }
}
