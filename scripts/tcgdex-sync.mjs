import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Robust manual env loading for .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  const regex = /^\s*([a-zA-Z0-9_]+)\s*=\s*(["']?)([\s\S]*?)\2\s*$/gm;
  let match;
  while ((match = regex.exec(envConfig)) !== null) {
    const key = match[1];
    const value = match[3];
    process.env[key] = value;
  }
}

const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TCGDEX_API_BASE = 'https://api.tcgdex.net/v2';
const CONCURRENCY_LIMIT = 1; // 1 set at a time to be safe
const CARD_FETCH_CONCURRENCY = 10; // 10 cards at a time

const parseCardNumber = (id) => {
  if (!id) return 999;
  const str = String(id);
  const trailingMatch = str.match(/-(\d+)$/);
  if (trailingMatch) {
    const num = parseInt(trailingMatch[1], 10);
    if (!isNaN(num)) return num;
  }
  const leadingMatch = str.match(/^(\d+)/);
  if (leadingMatch) {
    const num = parseInt(leadingMatch[1], 10);
    if (!isNaN(num)) return num;
  }
  return 999;
};

async function cleanDatabase() {
  console.log('🧹 [1/3] Cleaning up old legacy database collections...');
  const collections = ['pokemon-tcg-cards', 'pokemon-tcg-sets'];
  
  for (const coll of collections) {
    console.log(`Deleting all documents in '${coll}'...`);
    const collectionRef = db.collection(coll);
    const query = collectionRef.orderBy('__name__').limit(500);

    let keepGoing = true;
    while (keepGoing) {
      const snapshot = await query.get();
      if (snapshot.size === 0) {
        keepGoing = false;
        break;
      }
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      process.stdout.write(`Deleted ${snapshot.size} docs... `);
    }
    console.log(`\n✅ Finished cleaning ${coll}.`);
  }
}

async function fetchWithRetry(url, retries = 6) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: 25000,
        headers: { 'User-Agent': 'PokéTRKR/1.0-Node' },
      });
      return response.data;
    } catch (error) {
      const isRateLimit = error.response?.status === 429;
      const isNetworkError = error.code === 'ECONNABORTED' || error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || error.message?.includes('timeout') || error.message?.includes('socket hang up');
      const isServerError = error.response?.status >= 500;

      if (isRateLimit || isNetworkError || isServerError) {
        const waitTime = Math.pow(2, i) * 2000;
        console.log(`⚠️ Network delay (${error.code || error.message || error.response?.status}) on ${url}. Retrying (${i + 1}/${retries}) in ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
  return null;
}

export async function syncSetCards(language, setId, tcgdexSetId, forceAll = false) {
  console.log(`\n📦 Syncing cards for set: ${setId}`);
  const setData = await fetchWithRetry(`${TCGDEX_API_BASE}/${language}/sets/${tcgdexSetId}`);
  
  const briefCards = setData?.cards || [];
  if (briefCards.length === 0) {
    console.log(`  - No cards found for set ${setId}.`);
    return 0;
  }

  // Save the FULL detailed set to the database to ensure we have releaseDate, cardCount, etc.
  const setDocId = `${language}-${tcgdexSetId}`;
  await db.collection('pokemon-tcg-sets').doc(setDocId).set({
    ...setData,
    language,
    lastSynced: FieldValue.serverTimestamp()
  }, { merge: true });

  const cardsCollection = db.collection('pokemon-tcg-cards');

  // Check how many cards are already saved in Firestore for this set
  const existingCardsSnap = await cardsCollection.where('setId', '==', setId).select().get();
  const existingCardIds = new Set(existingCardsSnap.docs.map(doc => doc.id));

  // If not forcing all, only fetch the cards that are missing from the database
  const cardsToFetch = forceAll
    ? briefCards
    : briefCards.filter(briefCard => !existingCardIds.has(`${language}-${briefCard.id}`));

  if (cardsToFetch.length === 0) {
    console.log(`  ⚡ Set ${setId} is already 100% complete (${briefCards.length}/${briefCards.length} cards present). Skipping!`);
    return briefCards.length;
  }

  if (cardsToFetch.length < briefCards.length) {
    console.log(`  🔍 Set ${setId}: Found ${existingCardIds.size}/${briefCards.length} in DB. Fetching ${cardsToFetch.length} missing cards...`);
  } else {
    console.log(`  - Found ${briefCards.length} cards in set. Fetching details...`);
  }

  let totalSaved = existingCardIds.size;

  for (let i = 0; i < cardsToFetch.length; i += CARD_FETCH_CONCURRENCY) {
    const chunk = cardsToFetch.slice(i, i + CARD_FETCH_CONCURRENCY);
    
    // Fetch full details concurrently
    const detailPromises = chunk.map(async (briefCard) => {
      try {
        const fullCard = await fetchWithRetry(`${TCGDEX_API_BASE}/${language}/cards/${briefCard.id}`, 3);
        if (fullCard && !fullCard.image && briefCard.image) {
          fullCard.image = briefCard.image;
        }
        return fullCard;
      } catch (err) {
        console.log(`    ❌ Failed to fetch detailed card ${briefCard.id}`);
        return null;
      }
    });

    const detailedCards = await Promise.all(detailPromises);
    const validCards = detailedCards.filter(Boolean);

    if (validCards.length > 0) {
      const batch = db.batch();
      validCards.forEach(card => {
        const docId = `${language}-${card.id}`;
        const docRef = cardsCollection.doc(docId);

        // Extract TCGPlayer productIds (variant -> productId) before removing pricing block
        const productIds = {};
        if (card.pricing?.tcgplayer) {
          for (const [vKey, vData] of Object.entries(card.pricing.tcgplayer)) {
            if (vData && typeof vData === 'object' && vData.productId) {
              productIds[vKey] = vData.productId;
            }
          }
        }

        // Ensure images object ({ small, large }) is robustly populated from all possible TCGdex fields
        const baseImg = card.image || null;
        const smallImg = card.images?.small || (baseImg ? `${baseImg}/low.webp` : null);
        const largeImg = card.images?.large || (baseImg ? `${baseImg}/high.webp` : null);
        if (smallImg && largeImg) {
          card.images = { small: smallImg, large: largeImg };
        }

        // Prune redundant and bloated fields to keep card metadata lean (<1 KB)
        delete card.pricing;
        delete card.image; // Root image URL is redundant when images.small and images.large exist
        if (card.variants_detailed && Array.isArray(card.variants_detailed)) {
          card.variants_detailed.forEach(v => delete v.pricing);
        }

        const cardToSave = {
          ...card,
          ...(Object.keys(productIds).length > 0 ? { productIds } : {}),
          numberAsInt: parseCardNumber(card.localId ?? card.id),
          language,
          setId,
          lastUpdated: FieldValue.serverTimestamp(),
        };
        batch.set(docRef, cardToSave, { merge: true });
      });
      await batch.commit();
      totalSaved += validCards.length;
    }
    
    process.stdout.write(`  - Saved ${totalSaved}/${briefCards.length}...\r`);
    await sleep(200);
  }
  
  console.log(`\n  ✅ Completed set ${setId}: ${totalSaved} cards saved.`);
  return totalSaved;
}

export async function syncAll() {
  console.log('🚀 Starting Global TCGdex Sync (Terminal Version)...');

  try {
    // 1. Discover Sets
    console.log('\n📋 [1/2] Fetching all sets from TCGdex...');
    let allSets = [];
    const languages = ['en'];

    for (const lang of languages) {
      console.log(`Fetching ${lang.toUpperCase()} sets...`);
      const sets = await fetchWithRetry(`${TCGDEX_API_BASE}/${lang}/sets`);
      if (sets) {
        sets.forEach(s => {
          const logo = (s.logo || '').toLowerCase();
          const symbol = (s.symbol || '').toLowerCase();
          const id = (s.id || '').toLowerCase();
          const isPocketId = id === 'a1' || id === 'a1a' || id === 'a2' || id === 'a3' || id === 'a4' || id === 'p-a' || id === 'b1' || id === 'b2' || id === 'tcgp' ||
                             id.endsWith('-a1') || id.endsWith('-a1a') || id.endsWith('-a2') || id.endsWith('-a3') || id.endsWith('-a4') || id.endsWith('-p-a') || id.endsWith('-b1') || id.endsWith('-b2') || id.endsWith('-tcgp');
          
          if (!(logo.includes('/tcgp/') || symbol.includes('/tcgp/') || isPocketId)) {
            allSets.push({ ...s, language: lang });
          }
        });
      }
    }
    console.log(`✅ Discovered ${allSets.length} sets total.`);

    // 3. Save Sets to DB
    const setsBatch = db.batch();
    for (const set of allSets) {
      const setId = `${set.language}-${set.id}`;
      const docRef = db.collection('pokemon-tcg-sets').doc(setId);
      setsBatch.set(docRef, { ...set, lastSynced: FieldValue.serverTimestamp() }, { merge: true });
    }
    await setsBatch.commit();
    console.log('✅ All sets metadata saved to Firestore.');

    // 3. Sync Cards
    const forceAll = process.argv.includes('--force');
    if (forceAll) {
      console.log('\n⚠️ [FORCE MODE] `--force` flag passed. Re-fetching every card regardless of existing DB records.');
    } else {
      console.log('\n⚡ [SMART DELTA MODE] Checking DB first. Only missing sets or incomplete cards will be fetched!');
    }

    console.log('\n🃏 [2/2] Syncing detailed cards...');
    let completedSets = 0;
    let totalCards = 0;

    for (const set of allSets) {
      const setId = `${set.language}-${set.id}`;
      try {
        const count = await syncSetCards(set.language, setId, set.id, forceAll);
        totalCards += count;
        completedSets++;
      } catch (error) {
        console.error(`❌ Error syncing set ${setId}:`, error.message);
      }
      await sleep(1000); // 1-second pause between sets
    }

    console.log(`\n🎉 FINISHED! Successfully synced ${completedSets} sets and ${totalCards} detailed cards.`);
  } catch (error) {
    console.error('💥 Fatal error in global sync:', error);
  } finally {
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncAll();
}
