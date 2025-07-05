
import { NextResponse } from 'next/server';
import axios from 'axios';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Safely initializes the Firebase Admin SDK.
 * This function is designed to be called within an API route handler
 * to ensure that any initialization errors are caught and reported
 * correctly, rather than crashing the entire server process.
 */
function initializeFirebaseAdmin() {
  // The 're-initializing' check is crucial for development environments with hot-reloading.
  if (admin.apps.length > 0) {
    console.log("Firebase Admin SDK already initialized.");
    return;
  }

  console.log("Attempting to initialize Firebase Admin SDK...");
  
  const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccountJson) {
    throw new Error("CRITICAL: The GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set. The sync tool cannot authenticate with the database.");
  }
  if (!projectId) {
     throw new Error("CRITICAL: The FIREBASE_PROJECT_ID environment variable is not set.");
  }
  
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // The private key in .env files often has its newlines escaped as "\\n".
    // We must replace them with actual newlines "\n" for the SDK to parse it correctly.
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    } else {
        throw new Error("Service account JSON is missing the 'private_key' field.");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId,
    });

    console.log("Firebase Admin SDK initialized successfully for Sync API route.");
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization failed:", error.message);
    // Re-throw with a more specific message for easier debugging on the client.
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}. Please check your service account credentials and project ID in the .env file.`);
  }
}


export async function POST() {
  const logs: string[] = [];

  try {
    // Step 1: Initialize Firebase Admin. This is now done safely within the request.
    initializeFirebaseAdmin();
    const db = getFirestore();
    logs.push("Firebase Admin SDK is ready.");

    // Step 2: Check for Pokémon TCG API Key
    const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
    if (!apiKey) {
      throw new Error("Pokémon TCG API key is missing. Please add NEXT_PUBLIC_POKEMONTCG_API_KEY to your environment variables.");
    }
    logs.push("Pokémon TCG API key found.");

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
    // This generic catch block will now catch initialization errors too.
    console.error('Error during set sync API route:', error);
    const errorMessage = error.message || 'An unknown error occurred on the server.';
    logs.push(`❌ FATAL ERROR: ${errorMessage}`);
    
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
