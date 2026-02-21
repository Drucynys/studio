import { NextResponse } from 'next/server';
import axios from 'axios';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

const db = getFirebaseAdmin().firestore();
const POKEMON_TCG_API_BASE = 'https://api.pokemontcg.io/v2/cards';
const PAGE_SIZE = 100;
const BATCH_SIZE = 400;

const convertCardNumberToInt = (cardNumber: string): number => {
    if (!cardNumber) return 999;
    const match = cardNumber.match(/^\D*(\d+)/);
    return match && match[1] ? parseInt(match[1], 10) : (isNaN(parseInt(cardNumber, 10)) ? 999 : parseInt(cardNumber, 10));
};

const isValidDocId = (id: string): boolean => {
    return !!id && !id.includes('/') && id !== '.' && id !== '..';
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
    const logs: string[] = [];
    try {
        const { setId } = await request.json();
        if (!setId) return NextResponse.json({ status: 'error', message: "Missing setId", logs });

        const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
        if (!apiKey) return NextResponse.json({ status: 'error', message: "Missing API Key", logs });

        let allCards: any[] = [];
        let page = 1;
        let hasMore = true;
        let totalProcessed = 0;

        // Fetch phase
        while (hasMore && page <= 50) {
            try {
                if (page > 1) await sleep(1000); 

                const response = await axios.get(POKEMON_TCG_API_BASE, {
                    timeout: 50000, 
                    headers: { 'X-Api-Key': apiKey },
                    params: { q: `set.id:${setId}`, page, pageSize: PAGE_SIZE, orderBy: 'number' },
                });
                
                const { data, totalCount } = response.data;
                if (!data || data.length === 0) break;
                
                allCards = allCards.concat(data);
                
                if (allCards.length >= (totalCount || 0) || data.length < PAGE_SIZE) hasMore = false;
                else page++;

            } catch (apiError: any) {
                const msg = apiError.response?.status === 429 ? "Rate limited by TCG API" : apiError.message;
                return NextResponse.json({ status: 'error', message: `API Error on page ${page}: ${msg}`, logs });
            }
        }

        // Save phase
        const cardsCollection = db.collection('pokemon-tcg-cards');
        for (let i = 0; i < allCards.length; i += BATCH_SIZE) {
            const chunk = allCards.slice(i, i + BATCH_SIZE);
            const batch = db.batch();
            let batchCount = 0;
            
            chunk.forEach(card => {
                if (card?.id && isValidDocId(card.id)) {
                    const docRef = cardsCollection.doc(card.id);
                    const cardToSave = { ...card };
                    delete cardToSave.tcgplayer;
                    delete cardToSave.cardmarket;
                    cardToSave.numberAsInt = convertCardNumberToInt(card.number);
                    batch.set(docRef, cardToSave);
                    batchCount++;
                }
            });

            if (batchCount > 0) {
                try {
                    await batch.commit();
                    totalProcessed += batchCount;
                    await sleep(200); // Throttling
                } catch (dbError: any) {
                    // Log but don't crash the whole set
                    console.error(`Batch failed for set ${setId}:`, dbError.message);
                }
            }
        }
        
        return NextResponse.json({ status: 'success', count: totalProcessed, logs });

    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message, logs });
    }
}
