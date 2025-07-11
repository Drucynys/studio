
import { NextResponse } from 'next/server';
import axios from 'axios';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST() {
  const logs: string[] = ["- Starting Sync Process Checklist -"];

  try {
    // Check 1: Project ID Environment Variable
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (projectId) {
      logs.push(`✅ [Check 1] FIREBASE_PROJECT_ID found: '${projectId}'`);
    } else {
      logs.push("❌ [Check 1] FATAL: FIREBASE_PROJECT_ID environment variable is MISSING.");
      throw new Error("Missing FIREBASE_PROJECT_ID.");
    }

    // Check 2: TCG API Key Environment Variable
    const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
    if (apiKey) {
      logs.push("✅ [Check 2] NEXT_PUBLIC_POKEMONTCG_API_KEY found.");
    } else {
      logs.push("❌ [Check 2] FATAL: NEXT_PUBLIC_POKEMONTCG_API_KEY environment variable is MISSING.");
      throw new Error("Missing NEXT_PUBLIC_POKEMONTCG_API_KEY.");
    }
    
    // Check 3: Service Account JSON Environment Variable
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (serviceAccountJson && serviceAccountJson.length > 100) {
       logs.push("✅ [Check 3] GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable found and seems valid.");
    } else {
       logs.push("❌ [Check 3] FATAL: GOOGLE_APPLICATION_CREDENTIALS_JSON is MISSING or empty.");
       throw new Error("Missing or empty GOOGLE_APPLICATION_CREDENTIALS_JSON.");
    }

    // Check 4: Parse Service Account JSON
    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountJson);
        if (serviceAccount.private_key) {
            const serviceAccount = JSON.parse(serviceAccountJson);
if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}
        } else {
            throw new Error("Parsed JSON is missing the 'private_key' field.");
        }
        logs.push("✅ [Check 4] Successfully parsed service account credentials.");
    } catch (e: any) {
        logs.push(`❌ [Check 4] FATAL: Failed to parse service account JSON. The secret value may be corrupted. Error: ${e.message}`);
        throw new Error(`Invalid service account JSON format: ${e.message}`);
    }

    // Check 5: Initialize Firebase Admin
    try {
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: projectId,
            });
            logs.push("✅ [Check 5] Firebase Admin SDK initialized successfully.");
        } else {
            logs.push("✅ [Check 5] Firebase Admin SDK was already initialized.");
        }
    } catch (e: any) {
        logs.push(`❌ [Check 5] FATAL: Firebase Admin SDK initialization failed: ${e.message}`);
        throw new Error(`Firebase Admin SDK init error: ${e.message}`);
    }
    
    // Check 6: Obtain Firestore Instance
    let db;
    try {
        db = getFirestore();
        logs.push("✅ [Check 6] Firestore instance obtained successfully.");
    } catch (e: any) {
        logs.push(`❌ [Check 6] FATAL: Failed to get Firestore instance: ${e.message}`);
        throw new Error(`Failed to get Firestore instance: ${e.message}`);
    }

    // Check 7: Perform a test read from Firestore
    logs.push("- Performing Final Pre-flight Check -");
    try {
      // Robust check: attempt to read a non-existent document in a test collection.
      // This validates the connection and permissions without failing if a collection doesn't exist.
      await db.collection('_internal_test_').doc('connection_test').get();
      logs.push("✅ [Check 7] Successfully connected to Firestore and performed a test read.");
    } catch (e: any) {
        logs.push(`❌ [Check 7] FATAL: Test read from Firestore FAILED. This is the root cause. Error: ${e.message}`);
        throw new Error(`Firestore test read failed: ${e.message}`);
    }
    
    logs.push("- Checklist Complete. Starting Main Operation -");
    
    // Step 3: Fetch data from Pokémon TCG API
    logs.push("Fetching latest sets from Pokémon TCG API...");
    const response = await axios.get('https://api.pokemontcg.io/v2/sets', {
      headers: { 'X-Api-Key': apiKey }
    });
    
    const sets = response.data.data;
    if (!sets || sets.length === 0) {
      logs.push("No sets found from API. Exiting sync.");
      return NextResponse.json({ status: 'noop', count: 0, message: 'No sets found from API.', logs });
    }
    logs.push(`Found ${sets.length} sets. Preparing to write to database...`);
    
    // Step 4: Write to Firestore
    const setsCollection = db.collection('pokemon-tcg-sets');
    const batch = db.batch();
    let setsWritten = 0;

    sets.forEach((set: any) => {
      if (set && set.id) {
        const docRef = setsCollection.doc(set.id);
        const sanitizedSet = {
          id: set.id,
          name: set.name || 'Unknown Set',
          series: set.series || 'Unknown Series',
          printedTotal: set.printedTotal || 0,
          total: set.total || 0,
          releaseDate: set.releaseDate || 'N/A',
          images: {
            symbol: set.images?.symbol || '',
            logo: set.images?.logo || '',
          },
        };
        batch.set(docRef, sanitizedSet);
        setsWritten++;
      } else {
        logs.push(`Skipping a set due to missing ID: ${JSON.stringify(set)}`);
      }
    });

    await batch.commit();
    
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
