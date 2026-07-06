import { NextResponse, NextRequest } from 'next/server';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    admin.initializeApp();
  }
}
const db = admin.firestore();

// In-memory server cache for instant 0ms search & $0 read costs
let cachedCatalog: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

async function getCardCatalog(): Promise<any[]> {
  const now = Date.now();
  if (cachedCatalog && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedCatalog;
  }

  console.log('🔄 Loading search catalog from Firestore NoSQL...');
  const snapshot = await db.collection('pokemon-tcg-cards').get();
  cachedCatalog = snapshot.docs.map(doc => doc.data());
  lastCacheTime = now;
  console.log(`✅ Cached ${cachedCatalog.length} cards in server memory for instant search.`);
  return cachedCatalog;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qRaw = searchParams.get('q');

    if (!qRaw || qRaw.trim().length === 0) {
      return NextResponse.json([]);
    }

    const q = qRaw.trim().toLowerCase();
    const catalog = await getCardCatalog();

    // Check for "number/total" exact format (e.g. "4/102" or "135/165")
    const numMatch = q.match(/^(\d+)\s*\/\s*(\d+)$/);

    let results = catalog.filter(card => {
      if (numMatch) {
        const targetNum = numMatch[1];
        const targetTotal = parseInt(numMatch[2]);
        return (card.number === targetNum) && 
               (card.set?.printedTotal === targetTotal || card.set?.total === targetTotal);
      }

      const nameMatch = card.name?.toLowerCase().includes(q);
      const numExactMatch = card.number?.toLowerCase() === q;
      const setNameMatch = card.set?.name?.toLowerCase().includes(q);
      const artistMatch = card.artist?.toLowerCase().includes(q);

      return nameMatch || numExactMatch || setNameMatch || artistMatch;
    });

    // Score and sort for best relevance
    results.sort((a, b) => {
      const aNameExact = a.name?.toLowerCase() === q ? 1 : 0;
      const bNameExact = b.name?.toLowerCase() === q ? 1 : 0;
      if (aNameExact !== bNameExact) return bNameExact - aNameExact;

      const aNumExact = a.number?.toLowerCase() === q ? 1 : 0;
      const bNumExact = b.number?.toLowerCase() === q ? 1 : 0;
      if (aNumExact !== bNumExact) return bNumExact - aNumExact;

      const aNameStarts = a.name?.toLowerCase().startsWith(q) ? 1 : 0;
      const bNameStarts = b.name?.toLowerCase().startsWith(q) ? 1 : 0;
      if (aNameStarts !== bNameStarts) return bNameStarts - aNameStarts;

      // Fallback sort by release date newer first or card number
      return (b.set?.releaseDate || "").localeCompare(a.set?.releaseDate || "");
    });

    // Return top 48 most relevant cards to keep payload snappy
    const paginated = results.slice(0, 48);

    const response = NextResponse.json(paginated);
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return response;

  } catch (error) {
    console.error('Error in search-cards NoSQL route:', error);
    return NextResponse.json(
      { message: 'Error searching for cards', error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
