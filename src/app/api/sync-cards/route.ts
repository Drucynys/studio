
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
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
    });
}

export async function POST() {
    const logs: string[] = ["- Starting Full Card Sync Process -"];

    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        logs.push("✅ Firebase Admin SDK initialized.");

        const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
        if (!apiKey) throw new Error("Pokémon TCG API key is missing.");
        logs.push("✅ Pokémon TCG API key found.");

        let allCards: any[] = [];
        let page = 1;
        let hasMore = true;
        let totalCount = 0;

        logs.push("Fetching all cards from Pokémon TCG API... This may take several minutes.");

        while (hasMore) {
            try {
                const response = await axios.get(POKEMON_TCG_API_BASE, {
                    headers: { 'X-Api-Key': apiKey },
                    params: { page: page, pageSize: PAGE_SIZE, orderBy: 'set.releaseDate' },
                });
                
                const { data, count, totalCount: apiTotalCount } = response.data;
                if (!data || data.length === 0) {
                    hasMore = false;
                    continue;
                }
                
                allCards = allCards.concat(data);
                if (totalCount === 0) totalCount = apiTotalCount;
                logs.push(`Fetched page ${page}. Total cards so far: ${allCards.length} / ${totalCount}`);
                
                if (allCards.length >= totalCount) {
                    hasMore = false;
                } else {
                    page++;
                }
            } catch (apiError: any) {
                logs.push(`⚠️ WARN: Failed to fetch page ${page}. Retrying once...`);
                // Simple retry logic
                 const response = await axios.get(POKEMON_TCG_API_BASE, {
                    headers: { 'X-Api-Key': apiKey },
                    params: { page: page, pageSize: PAGE_SIZE, orderBy: 'set.releaseDate' },
                });
                 const { data, count, totalCount: apiTotalCount } = response.data;
                 if (!data || data.length === 0) { hasMore = false; }
                 else { allCards = allCards.concat(data); if (totalCount === 0) totalCount = apiTotalCount; logs.push(`Fetched page ${page} on retry.`); page++; }
            }
        }
        
        if (allCards.length === 0) throw new Error("No cards found from API.");
        logs.push(`✅ Finished fetching. Total cards found: ${allCards.length}.`);

        logs.push(`Preparing to write ${allCards.length} cards to Firestore in batches of ${BATCH_SIZE}...`);
        const cardsCollection = db.collection('pokemon-tcg-cards');
        const batchPromises: Promise<any>[] = [];

        for (let i = 0; i < allCards.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const chunk = allCards.slice(i, i + BATCH_SIZE);
            chunk.forEach(card => {
                if (card && card.id) {
                    const docRef = cardsCollection.doc(card.id);
                    batch.set(docRef, card); // Storing the full card object from the API
                }
            });
            batchPromises.push(batch.commit());
        }
        
        await Promise.all(batchPromises);
        logs.push(`✅ Successfully synced ${allCards.length} cards to Firestore.`);

        return NextResponse.json({ status: 'success', count: allCards.length, logs });

    } catch (error: any) {
        console.error('Error during full card sync API route:', error);
        const errorMessage = error.message || 'An unknown error occurred on the server.';
        logs.push(`❌ FATAL ERROR: ${errorMessage}`);
        return NextResponse.json({ status: 'error', message: errorMessage, logs }, { status: 500 });
    }
}
