
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
    // Check 1: Project ID Environment Variable
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      logs.push("❌ FATAL: FIREBASE_PROJECT_ID environment variable is MISSING.");
      throw new Error("Missing FIREBASE_PROJECT_ID.");
    }

    // Check 2: TCG API Key Environment Variable
    const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
    if (!apiKey) {
      logs.push("❌ FATAL: NEXT_PUBLIC_POKEMONTCG_API_KEY environment variable is MISSING.");
      throw new Error("Missing NEXT_PUBLIC_POKEMONTCG_API_KEY.");
    }
    
    // Check 3: Firebase Admin initialized (handled by centralized module)
    logs.push("✅ Firebase Admin SDK initialized via centralized module.");
    
    // Step 3: Fetch data from Pokémon TCG API with timeout and error handling
    logs.push("Fetching latest sets from Pokémon TCG API...");
    
    let response;
    try {
      response = await axios.get('https://api.pokemontcg.io/v2/sets', {
        headers: { 'X-Api-Key': apiKey },
        timeout: 30000, // 30 second timeout
        maxRedirects: 3,
        validateStatus: (status) => status >= 200 && status < 300
      });
    } catch (apiError: any) {
      let errorMessage = 'Failed to fetch sets from Pokemon TCG API';
      if (axios.isAxiosError(apiError)) {
        if (apiError.code === 'ECONNABORTED') {
          errorMessage = 'Request timeout - Pokemon TCG API took too long to respond';
        } else if (apiError.response) {
          errorMessage = `Pokemon TCG API Error: ${apiError.response.status} ${apiError.response.statusText}`;
        } else {
          errorMessage = `Network error: ${apiError.message}`;
        }
      }
      logs.push(`❌ ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    const sets = response.data?.data;
    if (!sets || !Array.isArray(sets) || sets.length === 0) {
      logs.push("⚠️ No sets found from API. This might indicate an API issue.");
      return NextResponse.json({ status: 'noop', count: 0, message: 'No sets found from API.', logs });
    }
    
    // Validate set data structure
    const validSets = sets.filter(set => set && set.id && typeof set.id === 'string');
    if (validSets.length !== sets.length) {
      logs.push(`⚠️ Filtered out ${sets.length - validSets.length} invalid sets`);
    }
    
    logs.push(`✅ Found ${validSets.length} valid sets. Preparing to write to database...`);
    
    // Step 4: Write to Firestore with proper error handling
    const setsCollection = db.collection('pokemon-tcg-sets');
    let setsWritten = 0;
    const FIRESTORE_BATCH_LIMIT = 500; // Firestore batch write limit

    // Process sets in batches to avoid Firestore limits
    for (let i = 0; i < validSets.length; i += FIRESTORE_BATCH_LIMIT) {
      const batch = db.batch();
      const chunk = validSets.slice(i, i + FIRESTORE_BATCH_LIMIT);
      let batchCount = 0;

      chunk.forEach((set: any) => {
        try {
          const docRef = setsCollection.doc(set.id);
          // Save the entire, unmodified set object from the API.
          // This is more robust and ensures all data is preserved.
          batch.set(docRef, {
            ...set,
            lastSynced: admin.firestore.FieldValue.serverTimestamp()
          });
          batchCount++;
        } catch (setError) {
          logs.push(`⚠️ Error preparing set ${set.id}: ${setError}`);
        }
      });

      if (batchCount > 0) {
        try {
          await batch.commit();
          setsWritten += batchCount;
          logs.push(`✅ Batch ${Math.floor(i / FIRESTORE_BATCH_LIMIT) + 1}: Wrote ${batchCount} sets`);
          
          // Small delay between batches to avoid rate limiting
          if (i + FIRESTORE_BATCH_LIMIT < validSets.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (batchError: any) {
          logs.push(`❌ Batch ${Math.floor(i / FIRESTORE_BATCH_LIMIT) + 1} failed: ${batchError.message}`);
          // Continue with next batch instead of failing completely
        }
      }
    }
    
    const successMessage = `Successfully synced ${setsWritten} sets to Firestore.`;
    logs.push("✅ " + successMessage);
    
    return NextResponse.json({ status: 'success', count: setsWritten, message: successMessage, logs });

  } catch (error: any) {
    console.error('Error during set sync API route:', error);
    const errorMessage = error.message || 'An unknown error occurred on the server.';
    logs.push(`❌ ERROR: ${errorMessage}`);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: errorMessage, 
        logs 
      }, 
      { status: 500 }
    );
  }
}
