import { NextResponse } from 'next/server';
import axios from 'axios';
import { db } from '@/lib/firebase-admin';

const TCGDEX_API_SET_DETAILS = 'https://api.tcgdex.net/v2/en/sets';
const BATCH_SIZE = 400; // Safer margin (limit is 500)

/**
 * Validates that a string is a safe Firestore document ID
 */
const isValidDocId = (id: string): boolean => {
  return !!id && !id.includes('/') && id !== '.' && id !== '..';
};

/**
 * Normalizes card numbers for consistent sorting.
 * Attempts to extract trailing numeric suffix (e.g. "base1-12" -> 12).
 * Falls back to leading digits, then to 999 as a sentinel.
 */
const parseCardNumber = (id: string | undefined): number => {
  if (!id) return 999;
  const str = String(id);
  // Try trailing digits after last hyphen
  const trailingMatch = str.match(/-(\d+)$/);
  if (trailingMatch) {
    const num = parseInt(trailingMatch[1], 10);
    if (!isNaN(num)) return num;
  }
  // Fallback: leading digits
  const leadingMatch = str.match(/^(\d+)/);
  if (leadingMatch) {
    const num = parseInt(leadingMatch[1], 10);
    if (!isNaN(num)) return num;
  }
  return 999;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Commits a Firestore WriteBatch with exponential back‑off retries.
 * @param batch Firestore WriteBatch to commit
 * @param setId Identifier for logging purposes
 */
const commitWithRetry = async (
  batch: FirebaseFirestore.WriteBatch,
  setId: string,
  maxRetries = 3,
  baseDelayMs = 300
) => {
  let attempt = 0;
  while (true) {
    try {
      await batch.commit();
      return; // success
    } catch (err: any) {
      attempt++;
      if (attempt > maxRetries) {
        console.error(
          `[sync-cards] Batch commit failed after ${attempt} attempts for set ${setId}:`,
          err
        );
        throw err;
      }
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }
};

export async function POST(request: Request) {
  const logs: string[] = [];
  try {
    const body = await request.json().catch(() => ({}));
    const { setId } = body;

    if (!setId) {
      return NextResponse.json(
        { status: 'error', message: 'Missing setId', logs },
        { status: 400 }
      );
    }

    logs.push(`- Starting resilient sync for set: ${setId} via TCGdex -`);

    let language = 'en';
    let tcgdexSetId = setId;
    if (setId.startsWith('en-') || setId.startsWith('ja-')) {
      language = setId.substring(0, 2);
      tcgdexSetId = setId.substring(3);
    }

    let allCards: any[] = [];

    // --- PHASE 1: FETCH DATA ---
    try {
      const setResponse = await axios.get(
        `https://api.tcgdex.net/v2/${language}/sets/${tcgdexSetId}`,
        {
          timeout: 50000,
          headers: { 'User-Agent': 'PokéTRKR/1.0' },
        }
      );

      let briefCards = [];
      if (setResponse.data && setResponse.data.cards) {
        briefCards = setResponse.data.cards;
      }

      if (briefCards.length > 0) {
        logs.push(`Found ${briefCards.length} brief cards. Fetching full detailed data...`);
        
        // Fetch detailed cards in controlled batches to avoid rate limits
        const CONCURRENCY = 10;
        for (let i = 0; i < briefCards.length; i += CONCURRENCY) {
          const chunk = briefCards.slice(i, i + CONCURRENCY);
          const detailPromises = chunk.map(async (briefCard: any) => {
            try {
              const res = await axios.get(
                `https://api.tcgdex.net/v2/${language}/cards/${briefCard.id}`,
                {
                  timeout: 10000,
                  headers: { 'User-Agent': 'PokéTRKR/1.0' },
                }
              );
              return res.data;
            } catch (err: any) {
              console.warn(`Failed to fetch details for ${briefCard.id}:`, err.message);
              return null; // Skip if single card fetch fails
            }
          });
          
          const detailedResults = await Promise.all(detailPromises);
          detailedResults.forEach(card => {
            if (card) allCards.push(card);
          });
          
          await sleep(500); // Respect API limits
        }
      }

    } catch (apiError: any) {
      const msg =
        apiError.response?.status === 429
          ? 'Rate limited by TCGdex API'
          : apiError.message;
      return NextResponse.json(
        { status: 'error', message: `API Error: ${msg}`, logs },
        { status: 502 }
      );
    }

    if (allCards.length === 0) {
      return NextResponse.json({
        status: 'success',
        count: 0,
        logs: [...logs, '⚠️ No cards found for this set.'],
      });
    }

    // --- PHASE 2: SAVE DATA IN RESILIENT BATCHES ---
    const cardsCollection = db.collection('pokemon-tcg-cards');
    let totalProcessed = 0;
    let failedBatches = 0;

    for (let i = 0; i < allCards.length; i += BATCH_SIZE) {
      const chunk = allCards.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      let validInBatch = 0;

      chunk.forEach((card) => {
        if (card?.id && isValidDocId(card.id)) {
          const docId = `${language}-${card.id}`;
          const docRef = cardsCollection.doc(docId);

          // Map TCGdex format slightly if needed
          const cardToSave = { ...card };

          // TCGdex sometimes returns pricing; we keep what it provides
          // Add helpful metadata
          cardToSave.numberAsInt = parseCardNumber(card.localId ?? card.id);
          cardToSave.lastUpdated = new Date().toISOString();
          cardToSave.language = language;
          // Ensure setId is stored if not present
          cardToSave.setId = setId;

          batch.set(docRef, cardToSave, { merge: true });
          validInBatch++;
        }
      });

      if (validInBatch > 0) {
        try {
          await commitWithRetry(batch, setId);
          totalProcessed += validInBatch;
          await sleep(200); // Throttle between batches
        } catch (dbError: any) {
          failedBatches++;
          console.error(
            `Batch commit failed for set ${setId}:`,
            dbError.message
          );
          // Continue with next batch; partial success model
        }
      }
    }

    const summary = `✅ Processed ${totalProcessed}/${allCards.length} cards.`;
    if (failedBatches > 0) {
      logs.push(`⚠️ Warning: ${failedBatches} batch(es) failed to write.`);
    }

    return NextResponse.json({
      status: 'success',
      count: totalProcessed,
      logs: [...logs, summary],
    });
  } catch (error: any) {
    console.error('Fatal error in sync-cards route:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Fatal server error',
        logs,
      },
      { status: 500 }
    );
  }
}