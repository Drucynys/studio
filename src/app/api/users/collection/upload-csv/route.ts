// src/app/api/users/collection/upload-csv/route.ts
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { PokemonCard } from '@/types';

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) { return; }
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!serviceAccountJson) {
        throw new Error("Firebase credentials are not set in environment variables.");
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
     if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const getDefaultMarketPrice = (apiCard: any): { value: number, variant?: string } => {
    if (!apiCard || !apiCard.tcgplayer?.prices) return { value: 0 };
    const prices = apiCard.tcgplayer.prices;
    const variantPriority = ['holofoil', 'reverseHolofoil', '1stEditionHolofoil', 'unlimitedHolofoil', 'normal', '1stEditionNormal', 'unlimitedNormal'];
    for (const variant of variantPriority) {
        if (prices[variant]?.market && typeof prices[variant]!.market === 'number') {
            return { value: prices[variant]!.market!, variant: variant };
        }
    }
    for (const key in prices) {
        if (Object.prototype.hasOwnProperty.call(prices, key) && prices[key]?.market && typeof prices[key]!.market === 'number') {
            return { value: prices[key]!.market!, variant: key };
        }
    }
    return { value: 0 };
};


export async function POST(request: Request) {
    console.log('[API] /api/users/collection/upload-csv endpoint hit.');
    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        console.log('[API] Firebase Admin initialized.');

        const authorization = request.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split("Bearer ")[1];
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        console.log(`[API] Authenticated user: ${userId}`);

        const { cards } = await request.json();
        if (!Array.isArray(cards) || cards.length === 0) {
            return NextResponse.json({ message: 'No card data provided.' }, { status: 400 });
        }

        const masterCardsRef = db.collection('pokemon-tcg-cards');
        const userCardsRef = db.collection('users', userId, 'cards');
        const batch = db.batch();
        const notFound: any[] = [];
        let addedCount = 0;

        // Process cards in chunks to avoid overwhelming Firestore queries
        const chunkSize = 100;
        for (let i = 0; i < cards.length; i += chunkSize) {
            const chunk = cards.slice(i, i + chunkSize);
            
            for (const card of chunk) {
                const query = masterCardsRef
                    .where('name', '==', card.name)
                    .where('set.name', '==', card.set)
                    .where('number', '==', card.cardNumber);
                
                const snapshot = await query.limit(1).get();

                if (snapshot.empty) {
                    notFound.push(card);
                } else {
                    const masterCardData = snapshot.docs[0].data();
                    const { value: cardValue, variant: cardVariant } = getDefaultMarketPrice(masterCardData);

                    const newCardDocRef = userCardsRef.doc();
                    const newCard: PokemonCard = {
                        id: newCardDocRef.id,
                        userId: userId,
                        apiId: masterCardData.id,
                        name: masterCardData.name,
                        set: masterCardData.set.name,
                        cardNumber: masterCardData.number,
                        rarity: masterCardData.rarity || 'N/A',
                        imageUrl: masterCardData.images?.large || masterCardData.images?.small || null,
                        quantity: card.quantity || 1,
                        value: cardValue, // Always use the fetched market price
                        variant: card.variant ?? cardVariant ?? null,
                        language: card.language || 'English',
                        artist: masterCardData.artist || null,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        isFavorite: card.isFavorite === 'true' || false,
                    };
                    batch.set(newCardDocRef, newCard);
                    addedCount++;
                }
            }
        }

        await batch.commit();

        return NextResponse.json({ 
            status: 'success', 
            message: `Processed ${cards.length} cards. Added ${addedCount} new cards to your collection.`,
            addedCount,
            notFoundCount: notFound.length,
            notFound,
        });

    } catch (error: any) {
        console.error(`[API] FATAL Error in upload-csv:`, error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
