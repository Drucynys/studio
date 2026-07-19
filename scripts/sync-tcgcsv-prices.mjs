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

const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}');

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TCGCSV_BASE_URL = 'https://tcgcsv.com/tcgplayer/3';
const GROUP_FETCH_CONCURRENCY = 8; // Concurrency limit for fetching set price files
const BATCH_SIZE = 450; // Firestore batch size limit

/**
 * Helper to normalize and match subTypeName from TCGPlayer to our variantKey
 */
function isVariantMatch(subTypeName = '', variantKey = '') {
  if (!subTypeName) return true; // If TCGplayer didn't specify subType, allow match
  const st = subTypeName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const vk = variantKey.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (st === vk) return true;
  if ((st.includes('reverse') && vk.includes('reverse')) || (st === 'reverseholofoil' && vk === 'reverseholofoil')) return true;
  if ((st.includes('normal') || st === 'nonholo') && vk === 'normal') return true;
  if ((st.includes('holofoil') || st === 'holo') && (vk.includes('holofoil') || vk === 'holo')) return true;
  if ((st.includes('1stedition') || st.includes('firstedition')) && (vk.includes('firstedition') || vk.includes('1st'))) return true;

  return false;
}

async function fetchWithRetry(url, retries = 4) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: 20000,
        headers: { 'User-Agent': 'PokeTRKR-Sync-Engine/1.0' },
      });
      return response.data;
    } catch (error) {
      const isRateLimit = error.response?.status === 429;
      if (isRateLimit || error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        const waitTime = Math.pow(2, i) * 1500;
        console.log(`⚠️ Delay fetching ${url}. Retrying in ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      if (error.response?.status === 404) {
        return null; // Group might not have prices yet
      }
      throw error;
    }
  }
  return null;
}

async function runPriceSync() {
  console.log('🚀 Starting TCGCSV Live Price Sync (`card_prices` collection)...');
  const startTime = Date.now();

  try {
    // 1. Build productId -> Card Map from `pokemon-tcg-cards`
    console.log('\n📋 [1/3] Indexing productIds from `pokemon-tcg-cards` collection...');
    const productIdToCardsMap = new Map();
    let totalCardsIndexed = 0;

    const cardsSnapshot = await db.collection('pokemon-tcg-cards').get();
    cardsSnapshot.forEach((doc) => {
      const card = doc.data();
      const productIds = card.productIds || {};

      // Fallback check: if card still has legacy card.pricing.tcgplayer before clean re-sync
      if (card.pricing?.tcgplayer) {
        for (const [vKey, vData] of Object.entries(card.pricing.tcgplayer)) {
          if (vData?.productId && !productIds[vKey]) {
            productIds[vKey] = vData.productId;
          }
        }
      }

      const keys = Object.keys(productIds);
      if (keys.length > 0) {
        totalCardsIndexed++;
        for (const [variantKey, pId] of Object.entries(productIds)) {
          const numId = Number(pId);
          if (!isNaN(numId)) {
            if (!productIdToCardsMap.has(numId)) {
              productIdToCardsMap.set(numId, []);
            }
            productIdToCardsMap.get(numId).push({
              cardApiId: doc.id,
              setId: card.setId || 'unknown',
              variantKey,
            });
          }
        }
      }
    });

    console.log(`✅ Indexed ${totalCardsIndexed} cards (${productIdToCardsMap.size} unique TCGPlayer productIds).`);

    if (productIdToCardsMap.size === 0) {
      console.log('⚠️ No productIds found in database. Make sure you have synced cards with `node scripts/tcgdex-sync.mjs` first!');
      return;
    }

    // 2. Fetch all Groups (Sets) from TCGCSV
    console.log('\n📦 [2/3] Fetching TCGPlayer Pokémon groups from `tcgcsv.com`...');
    const groupsResponse = await fetchWithRetry(`${TCGCSV_BASE_URL}/groups`);
    if (!groupsResponse || !groupsResponse.results) {
      throw new Error('Failed to fetch group list from TCGCSV.');
    }

    const groups = groupsResponse.results;
    console.log(`✅ Found ${groups.length} Pokémon groups on TCGCSV.`);

    // 3. Fetch current prices for all groups concurrently and map marketPrices
    console.log('\n💸 [3/3] Downloading price feeds and mapping live marketPrice snapshots...');
    const cardUpdates = new Map(); // cardApiId -> { setId, marketPrices: { holofoil: 12.50 } }

    let completedGroups = 0;
    for (let i = 0; i < groups.length; i += GROUP_FETCH_CONCURRENCY) {
      const chunk = groups.slice(i, i + GROUP_FETCH_CONCURRENCY);

      const groupPromises = chunk.map(async (group) => {
        const groupId = group.groupId;
        const priceData = await fetchWithRetry(`${TCGCSV_BASE_URL}/${groupId}/prices`);
        if (!priceData || !priceData.results) return;

        for (const entry of priceData.results) {
          const pId = Number(entry.productId);
          const marketPrice = entry.marketPrice;

          if (marketPrice === null || marketPrice === undefined || isNaN(marketPrice)) {
            continue; // Skip items without a market price
          }

          const matchedCards = productIdToCardsMap.get(pId);
          if (matchedCards) {
            for (const match of matchedCards) {
              // If multiple variants share this productId, check subTypeName
              if (matchedCards.length === 1 || isVariantMatch(entry.subTypeName, match.variantKey)) {
                if (!cardUpdates.has(match.cardApiId)) {
                  cardUpdates.set(match.cardApiId, {
                    setId: match.setId,
                    marketPrices: {},
                  });
                }
                cardUpdates.get(match.cardApiId).marketPrices[match.variantKey] = Number(marketPrice.toFixed(2));
              }
            }
          }
        }
      });

      await Promise.all(groupPromises);
      completedGroups += chunk.length;
      process.stdout.write(`  - Processed ${Math.min(completedGroups, groups.length)}/${groups.length} groups...\r`);
    }

    console.log(`\n\n🎯 Matched live marketPrice for ${cardUpdates.size} cards across the database.`);

    // 4. Batch save updates to Firestore `card_prices` collection
    console.log('\n💾 Saving snapshots to `card_prices` collection inside Firestore...');
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const updatesList = Array.from(cardUpdates.entries());
    let totalSaved = 0;

    for (let i = 0; i < updatesList.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = updatesList.slice(i, i + BATCH_SIZE);

      for (const [cardApiId, data] of chunk) {
        const docRef = db.collection('card_prices').doc(cardApiId);
        batch.set(
          docRef,
          {
            cardApiId,
            setId: data.setId,
            updated: todayStr,
            lastUpdatedTimestamp: FieldValue.serverTimestamp(),
            marketPrices: data.marketPrices,
          },
          { merge: true }
        );
      }

      await batch.commit();
      totalSaved += chunk.length;
      process.stdout.write(`  - Committed ${totalSaved}/${updatesList.length} documents...\r`);
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n\n🎉 SUCCESS! Updated ${totalSaved} cards in \`card_prices\` in ${durationSec}s.`);
  } catch (error) {
    console.error('💥 Fatal error during TCGCSV price sync:', error);
  } finally {
    process.exit(0);
  }
}

runPriceSync();
