import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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
if (getApps().length === 0 && serviceAccount.project_id) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const CACHE_DIR = path.resolve(process.cwd(), 'cache');
const ARCHIVES_DIR = path.join(CACHE_DIR, 'tcgcsv_archives');
const UNPACKED_DIR = path.join(CACHE_DIR, 'tcgcsv_unpacked');
const OUTPUT_FILE = path.join(CACHE_DIR, 'clean_card_price_history.json');

const BATCH_SIZE = 450;

/**
 * Helper to normalize and match subTypeName from TCGPlayer to our variantKey
 */
function isVariantMatch(subTypeName = '', variantKey = '') {
  if (!subTypeName) return true;
  const st = subTypeName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const vk = variantKey.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (st === vk) return true;
  if ((st.includes('reverse') && vk.includes('reverse')) || (st === 'reverseholofoil' && vk === 'reverseholofoil')) return true;
  if ((st.includes('normal') || st === 'nonholo') && vk === 'normal') return true;
  if ((st.includes('holofoil') || st === 'holo') && (vk.includes('holofoil') || vk === 'holo')) return true;
  if ((st.includes('1stedition') || st.includes('firstedition')) && (vk.includes('firstedition') || vk.includes('1st'))) return true;

  return false;
}

/**
 * Generates an array of date strings between startDate and endDate (YYYY-MM-DD)
 */
function getDateRange(startDateStr, endDateStr, stepDays = 1) {
  const dates = [];
  let current = new Date(startDateStr);
  const end = new Date(endDateStr);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + stepDays);
  }
  return dates;
}

async function downloadArchive(dateStr) {
  const url = `https://tcgcsv.com/archive/tcgplayer/prices-${dateStr}.ppmd.7z`;
  const destPath = path.join(ARCHIVES_DIR, `prices-${dateStr}.ppmd.7z`);

  if (fs.existsSync(destPath)) {
    return destPath; // Already downloaded
  }

  try {
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream',
      timeout: 30000,
      headers: { 'User-Agent': 'PokeTRKR-History-Engine/1.0' },
    });

    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(destPath));
      writer.on('error', (err) => {
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(err);
      });
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // Archive doesn't exist for this specific date
    }
    throw error;
  }
}

async function extractAndParseDate(dateStr, archivePath, productIdToCardsMap, masterHistory) {
  const destDir = path.join(UNPACKED_DIR, dateStr);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  try {
    // Unzip using 7z
    execSync(`7z x "${archivePath}" -o"${destDir}" -y > /dev/null 2>&1`, { stdio: 'ignore' });

    // Look inside destDir for /3/{groupId}/prices (or root /YYYY-MM-DD/3/{groupId}/prices)
    let pokemonDir = path.join(destDir, '3');
    if (!fs.existsSync(pokemonDir)) {
      pokemonDir = path.join(destDir, dateStr, '3');
    }

    if (!fs.existsSync(pokemonDir)) {
      return 0; // No Pokémon folder found inside archive
    }

    const groupIds = fs.readdirSync(pokemonDir);
    let totalPricesMatched = 0;

    for (const groupId of groupIds) {
      const pricesFile = path.join(pokemonDir, groupId, 'prices');
      if (fs.existsSync(pricesFile)) {
        try {
          const content = fs.readFileSync(pricesFile, 'utf-8');
          const priceEntries = JSON.parse(content);
          const results = Array.isArray(priceEntries) ? priceEntries : priceEntries.results || [];

          for (const entry of results) {
            const pId = Number(entry.productId);
            const marketPrice = entry.marketPrice;

            if (marketPrice === null || marketPrice === undefined || isNaN(marketPrice)) continue;

            const matchedCards = productIdToCardsMap.get(pId);
            if (matchedCards) {
              for (const match of matchedCards) {
                if (matchedCards.length === 1 || isVariantMatch(entry.subTypeName, match.variantKey)) {
                  if (!masterHistory[match.cardApiId]) {
                    masterHistory[match.cardApiId] = {
                      cardApiId: match.cardApiId,
                      history: {},
                    };
                  }
                  if (!masterHistory[match.cardApiId].history[match.variantKey]) {
                    masterHistory[match.cardApiId].history[match.variantKey] = {};
                  }
                  masterHistory[match.cardApiId].history[match.variantKey][dateStr] = Number(marketPrice.toFixed(2));
                  totalPricesMatched++;
                }
              }
            }
          }
        } catch (e) {
          // Ignore corrupted single price file
        }
      }
    }

    return totalPricesMatched;
  } finally {
    // Cleanup unpacked files and raw archive to keep disk clean
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
    if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
  }
}

async function uploadToFirestore() {
  console.log('🚀 Starting Cloud Upload Stage (`card_price_history` -> Firestore)...');
  if (!fs.existsSync(OUTPUT_FILE)) {
    console.error(`❌ Cannot upload: local file '${OUTPUT_FILE}' not found. Run extraction step first!`);
    return;
  }

  const content = fs.readFileSync(OUTPUT_FILE, 'utf-8');
  const masterHistory = JSON.parse(content);
  const entries = Object.entries(masterHistory);

  console.log(`📋 Found ${entries.length} cards in clean local history file.`);
  let totalUploaded = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = entries.slice(i, i + BATCH_SIZE);

    for (const [cardApiId, data] of chunk) {
      const docRef = db.collection('card_price_history').doc(cardApiId);
      batch.set(
        docRef,
        {
          cardApiId: data.cardApiId,
          lastUpdated: FieldValue.serverTimestamp(),
          history: data.history,
        },
        { merge: true }
      );
    }

    await batch.commit();
    totalUploaded += chunk.length;
    process.stdout.write(`  - Uploaded ${totalUploaded}/${entries.length} cards to Firestore...\r`);
  }

  console.log(`\n\n🎉 SUCCESS! Uploaded all ${totalUploaded} cards to \`card_price_history\` collection.`);
}

async function run() {
  const args = process.argv.slice(2);
  const isUploadOnly = args.includes('--upload');
  const isAll = args.includes('--all');
  const stepDays = args.includes('--step=7') ? 7 : args.includes('--step=3') ? 3 : 1;

  if (isUploadOnly) {
    await uploadToFirestore();
    return;
  }

  console.log('🚀 Starting Local TCGCSV Historical Backfill Engine...');
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(ARCHIVES_DIR)) fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
  if (!fs.existsSync(UNPACKED_DIR)) fs.mkdirSync(UNPACKED_DIR, { recursive: true });

  // 1. Index productIds from Firestore
  console.log('\n📋 [1/3] Indexing productIds from `pokemon-tcg-cards` collection...');
  const productIdToCardsMap = new Map();
  let totalCardsIndexed = 0;

  const cardsSnapshot = await db.collection('pokemon-tcg-cards').get();
  cardsSnapshot.forEach((doc) => {
    const card = doc.data();
    const productIds = card.productIds || {};

    if (card.pricing?.tcgplayer) {
      for (const [vKey, vData] of Object.entries(card.pricing.tcgplayer)) {
        if (vData?.productId && !productIds[vKey]) productIds[vKey] = vData.productId;
      }
    }

    if (Object.keys(productIds).length > 0) {
      totalCardsIndexed++;
      for (const [variantKey, pId] of Object.entries(productIds)) {
        const numId = Number(pId);
        if (!isNaN(numId)) {
          if (!productIdToCardsMap.has(numId)) productIdToCardsMap.set(numId, []);
          productIdToCardsMap.get(numId).push({ cardApiId: doc.id, variantKey });
        }
      }
    }
  });

  console.log(`✅ Indexed ${totalCardsIndexed} cards (${productIdToCardsMap.size} unique productIds).`);
  if (productIdToCardsMap.size === 0) {
    console.log('⚠️ No productIds found in database. Make sure you have synced cards first!');
    return;
  }

  // 2. Load or initialize local output JSON
  let masterHistory = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      masterHistory = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      console.log(`📂 Loaded existing history for ${Object.keys(masterHistory).length} cards from '${OUTPUT_FILE}'.`);
    } catch (e) {
      console.log('⚠️ Could not parse existing local output, starting fresh.');
    }
  }

  // 3. Determine dates to process
  const todayStr = new Date().toISOString().split('T')[0];
  const startDateStr = '2024-02-08';
  let dateRange = getDateRange(startDateStr, todayStr, stepDays);

  if (!isAll) {
    // Test mode: pick 3 sample dates across the timeline if --all is not specified
    console.log('\n🧪 [TEST MODE] Processing 3 sample dates (`--all` not passed).');
    dateRange = ['2024-02-08', '2025-02-08', todayStr];
  } else {
    console.log(`\n📅 [FULL BACKFILL] Processing ${dateRange.length} dates (step=${stepDays} days)...`);
  }

  console.log('\n📦 [2/3] Downloading archives & extracting clean daily histories...');
  let processedCount = 0;

  for (const dateStr of dateRange) {
    process.stdout.write(`  - [${dateStr}] Downloading archive...\r`);
    const archivePath = await downloadArchive(dateStr);

    if (!archivePath) {
      process.stdout.write(`  - [${dateStr}] ⚠️ Archive not found (404), skipping.\n`);
      continue;
    }

    process.stdout.write(`  - [${dateStr}] Unzipping & extracting prices...\r`);
    const matched = await extractAndParseDate(dateStr, archivePath, productIdToCardsMap, masterHistory);
    process.stdout.write(`  - [${dateStr}] ✅ Extracted ${matched} price points cleanly.\n`);
    processedCount++;
  }

  // 4. Save clean local JSON file
  console.log('\n💾 [3/3] Saving cleaned multi-year history to local disk...');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(masterHistory, null, 2), 'utf-8');

  const fileSizeBytes = fs.statSync(OUTPUT_FILE).size;
  const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
  const totalCardsWithHistory = Object.keys(masterHistory).length;

  console.log(`\n🎉 SUCCESS! Local extraction complete.`);
  console.log(`📄 Saved clean history for ${totalCardsWithHistory} cards -> '${OUTPUT_FILE}' (${fileSizeMB} MB).`);
  console.log(`\n👉 Next step: Verify the local JSON file. When ready, upload to Firestore by running:`);
  console.log(`   node scripts/backfill-tcgcsv-history.mjs --upload`);
}

run();
