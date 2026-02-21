
import { NextResponse } from 'next/server';
import axios from 'axios';
import admin from 'firebase-admin';

// Re-initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

export async function POST() {
  const logs: string[] = ["- Starting Sync Process Checklist -"];

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      logs.push("❌ FATAL: FIREBASE_PROJECT_ID environment variable is MISSING.");
      return NextResponse.json({ status: 'error', message: "Missing FIREBASE_PROJECT_ID.", logs });
    }

    const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
    if (!apiKey) {
      logs.push("❌ FATAL: NEXT_PUBLIC_POKEMONTCG_API_KEY environment variable is MISSING.");
      return NextResponse.json({ status: 'error', message: "Missing NEXT_PUBLIC_POKEMONTCG_API_KEY.", logs });
    }
    
    logs.push("✅ Firebase Admin SDK initialized.");
    logs.push("Fetching latest sets from Pokémon TCG API...");
    
    let response;
    try {
      // Use a timeout that is shorter than the platform's gateway timeout (usually 60s)
      // This allows us to return a proper JSON error rather than a generic 504 HTML page.
      response = await axios.get('https://api.pokemontcg.io/v2/sets', {
        headers: { 'X-Api-Key': apiKey },
        timeout: 45000, 
      });
    } catch (apiError: any) {
      let errorMessage = apiError.message || 'Failed to fetch sets from Pokemon TCG API';
      if (apiError.code === 'ECONNABORTED' || apiError.message.includes('timeout')) {
          errorMessage = "The TCG API took too long to respond (45s internal timeout). The platform's gateway might have also timed out.";
      }
      logs.push(`❌ ${errorMessage}`);
      // Return 200 with status: error to avoid platform-injected HTML error pages
      return NextResponse.json({ status: 'error', message: errorMessage, logs });
    }
    
    const sets = response.data?.data;
    if (!sets || !Array.isArray(sets) || sets.length === 0) {
      logs.push("⚠️ No sets found from API.");
      return NextResponse.json({ status: 'noop', count: 0, message: 'No sets found from API.', logs });
    }
    
    const validSets = sets.filter(set => set && set.id && typeof set.id === 'string');
    logs.push(`✅ Found ${validSets.length} valid sets. Writing to database...`);
    
    const setsCollection = db.collection('pokemon-tcg-sets');
    let setsWritten = 0;
    const BATCH_LIMIT = 400;

    for (let i = 0; i < validSets.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      const chunk = validSets.slice(i, i + BATCH_LIMIT);
      
      chunk.forEach((set: any) => {
        const docRef = setsCollection.doc(set.id);
        batch.set(docRef, {
          ...set,
          lastSynced: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });

      try {
        await batch.commit();
        setsWritten += chunk.length;
        logs.push(`✅ Batch ${Math.floor(i / BATCH_LIMIT) + 1}: Wrote ${chunk.length} sets`);
      } catch (dbError: any) {
        logs.push(`⚠️ Batch error: ${dbError.message}`);
      }
    }
    
    logs.push(`✅ Successfully synced ${setsWritten} sets.`);
    return NextResponse.json({ status: 'success', count: setsWritten, logs });

  } catch (error: any) {
    console.error('Error during set sync API route:', error);
    const msg = error.message || 'An unknown error occurred.';
    logs.push(`❌ FATAL ERROR: ${msg}`);
    return NextResponse.json({ status: 'error', message: msg, logs });
  }
}
