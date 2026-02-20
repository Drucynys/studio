
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

const ARTISTS_COLLECTION = 'pokemon-tcg-artists';
const CARDS_COLLECTION = 'pokemon-tcg-cards';
const BATCH_SIZE = 400;

export async function GET() {
    try {
        const snapshot = await db.collection(ARTISTS_COLLECTION).orderBy('cardCount', 'desc').get();
        return NextResponse.json(snapshot.docs.map(doc => doc.data()));
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message });
    }
}

export async function POST() {
    const logs: string[] = ["- Generating Artist Database -"];
    try {
        const snapshot = await db.collection(CARDS_COLLECTION).select('artist').get();
        if (snapshot.empty) return NextResponse.json({ status: 'error', message: "No cards found.", logs });

        const artistCounts = new Map<string, number>();
        snapshot.forEach(doc => {
            const artist = doc.data().artist;
            if (artist && typeof artist === 'string' && artist.trim() !== '') {
                artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
            }
        });

        const artistList = Array.from(artistCounts.entries()).map(([name, cardCount]) => ({ name, cardCount }));
        const artistsCollection = db.collection(ARTISTS_COLLECTION);

        for (let i = 0; i < artistList.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const chunk = artistList.slice(i, i + BATCH_SIZE);
            chunk.forEach(artist => {
                const docId = artist.name.replace(/\//g, '_');
                batch.set(artistsCollection.doc(docId), artist);
            });
            await batch.commit();
            logs.push(`✅ Saved ${chunk.length} artists...`);
        }
        
        return NextResponse.json({ status: 'success', count: artistList.length, logs });
    } catch (error: any) {
        logs.push(`❌ Error: ${error.message}`);
        return NextResponse.json({ status: 'error', message: error.message, logs });
    }
}
