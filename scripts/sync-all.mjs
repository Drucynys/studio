import admin from 'firebase-admin';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Robust manual env loading for .env.local (handles multiline JSON)
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  // Regex to match KEY="VALUE" or KEY=VALUE where VALUE can be multiline
  const regex = /^\s*([a-zA-Z0-9_]+)\s*=\s*(["']?)([\s\S]*?)\2\s*$/gm;
  let match;
  while ((match = regex.exec(envConfig)) !== null) {
    const key = match[1];
    const value = match[3];
    process.env[key] = value;
  }
}

const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
const POKEMON_TCG_API_KEY = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const POKEMON_TCG_API_BASE = 'https://api.pokemontcg.io/v2';
const CONCURRENCY_LIMIT = 2; // Conservative limit
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, params = {}, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        params,
        headers: { 'X-Api-Key': POKEMON_TCG_API_KEY },
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
        const waitTime = Math.pow(2, i) * 2000 + Math.random() * 1000;
        console.log(`⚠️ Rate limited. Waiting ${Math.round(waitTime)}ms...`);
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

async function syncSetCards(setId) {
  console.log(`\n📦 Syncing cards for set: ${setId}`);
  let page = 1;
  let totalSaved = 0;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchWithRetry(`${POKEMON_TCG_API_BASE}/cards`, {
      q: `set.id:${setId}`,
      page,
      pageSize: 250,
      orderBy: 'number',
    });

    const cards = data.data;
    if (!cards || cards.length === 0) break;

    // --- FIRESTORE BATCH ---
    const batch = db.batch();
    cards.forEach((card) => {
      const docRef = db.collection('pokemon-tcg-cards').doc(card.id);
      const numberAsInt = parseInt(card.number) || 999;
      batch.set(
        docRef,
        {
          ...card,
          numberAsInt,
          lastSynced: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
    await batch.commit();

    totalSaved += cards.length;
    console.log(
      `  - Page ${page}: Saved ${cards.length} cards (Total: ${totalSaved}/${data.totalCount})`
    );

    if (totalSaved >= data.totalCount || cards.length < 250) {
      hasMore = false;
    } else {
      page++;
      await sleep(500);
    }
  }
  return totalSaved;
}

async function syncAll() {
  console.log('🚀 Starting Global Pokémon TCG Sync (Firestore + SQL)...');

  try {
    console.log('📋 Fetching all sets...');
    const setsData = await fetchWithRetry(`${POKEMON_TCG_API_BASE}/sets`);
    const allSets = setsData.data;
    console.log(`✅ Found ${allSets.length} sets.`);

    // 1. Sync Sets to Firestore AND SQL
    console.log('📦 Syncing set metadata...');
    const setsBatch = db.batch();
    for (const set of allSets) {
      const docRef = db.collection('pokemon-tcg-sets').doc(set.id);
      setsBatch.set(
        docRef,
        { ...set, lastSynced: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    }
    await setsBatch.commit();
    console.log('✅ All sets metadata updated in Firestore & SQL.');

    const queue = [...allSets];
    const totalSets = queue.length;
    let completedSets = 0;
    let totalCards = 0;

    const worker = async () => {
      while (queue.length > 0) {
        const set = queue.shift();
        try {
          const count = await syncSetCards(set.id);
          totalCards += count;
          completedSets++;
          console.log(`✅ [${completedSets}/${totalSets}] Completed ${set.name}.`);
        } catch (error) {
          console.error(`❌ Error syncing set ${set.id}:`, error.message);
        }
      }
    };

    const workers = Array(CONCURRENCY_LIMIT)
      .fill(0)
      .map(() => worker());
    await Promise.all(workers);

    console.log(`\n🎉 FINISHED! Total sets: ${completedSets}, Total cards: ${totalCards}`);
  } catch (error) {
    console.error('💥 Fatal error in global sync:', error);
  } finally {
    process.exit(0);
  }
}

syncAll();
