
import { NextResponse } from 'next/server';
import axios from 'axios';
import { dbAdmin } from '@/lib/firebase-admin';

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
    const setsCollection = dbAdmin.collection('pokemon-tcg-sets');
    const batch = dbAdmin.batch();
    let setsWritten = 0;

    sets.forEach((set: any) => {
      if (set && set.id) {
        const docRef = setsCollection.doc(set.id);
        // Save the entire, unmodified set object from the API.
        // This is more robust and ensures all data is preserved.
        batch.set(docRef, set);
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
