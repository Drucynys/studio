import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fetch from 'node-fetch';

// Initialize Firebase Admin SDK
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
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();
const TCGDEX_API_BASE = 'https://api.tcgdex.net/v2';
const languages = ['en', 'ja'];

async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function syncSetsOnly() {
  console.log('🚀 Starting Full Set Metadata Sync...');

  for (const language of languages) {
    console.log(`\n📦 Fetching all sets for language: ${language}`);
    const briefSets = await fetchWithRetry(`${TCGDEX_API_BASE}/${language}/sets`);
    
    console.log(`Found ${briefSets.length} sets. Fetching full details for each...`);
    
    let processed = 0;
    const batchSize = 50;
    let batch = db.batch();
    let batchCount = 0;

    for (const briefSet of briefSets) {
      try {
        // Fetch full detailed set
        const fullSet = await fetchWithRetry(`${TCGDEX_API_BASE}/${language}/sets/${briefSet.id}`);
        
        const setDocId = `${language}-${briefSet.id}`;
        const setRef = db.collection('pokemon-tcg-sets').doc(setDocId);
        
        batch.set(setRef, {
          ...fullSet,
          language,
          lastSynced: FieldValue.serverTimestamp()
        }, { merge: true });

        batchCount++;
        processed++;

        if (batchCount >= batchSize) {
          await batch.commit();
          console.log(`  Saved ${processed} / ${briefSets.length} detailed sets...`);
          batch = db.batch();
          batchCount = 0;
        }

        // Small delay to prevent rate-limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`  ❌ Failed to fetch/save set ${briefSet.id}:`, error.message);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`  Saved ${processed} / ${briefSets.length} detailed sets...`);
    }
  }
  
  console.log('\n✅ Set Metadata Sync Complete!');
  process.exit(0);
}

syncSetsOnly().catch(console.error);
