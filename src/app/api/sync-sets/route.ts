import { NextResponse } from 'next/server';
import axios from 'axios';
import admin from 'firebase-admin';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

const db = getFirebaseAdmin().firestore();
const POKEMON_TCG_API_SETS = 'https://api.pokemontcg.io/v2/sets';

/**
 * Handles Set Discovery and Saving in a granular way to prevent timeouts.
 * Supported actions: 
 * - 'discover': Proxies a paged request to the TCG API.
 * - 'save': Saves a provided list of sets to Firestore.
 */
export async function POST(request: Request) {
  const logs: string[] = [];
  
  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'legacy', page = 1, pageSize = 25, sets = [] } = body;

    const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ status: 'error', message: "Missing API Key", logs });
    }

    // --- ACTION: DISCOVER (Proxy to TCG API) ---
    // Reduced page size ensures each individual request is fast.
    if (action === 'discover') {
      try {
        const response = await axios.get(POKEMON_TCG_API_SETS, {
          headers: { 'X-Api-Key': apiKey },
          params: { page, pageSize, orderBy: 'releaseDate' },
          timeout: 50000, 
        });

        return NextResponse.json({
          status: 'success',
          data: response.data.data,
          totalCount: response.data.totalCount,
          page: response.data.page,
          pageSize: response.data.pageSize,
        });
      } catch (apiError: any) {
        const msg = apiError.response?.status === 429 ? "Rate limited by TCG API" : apiError.message;
        return NextResponse.json({ status: 'error', message: msg });
      }
    }

    // --- ACTION: SAVE (Write provided sets to Firestore) ---
    if (action === 'save') {
      if (!Array.isArray(sets) || sets.length === 0) {
        return NextResponse.json({ status: 'noop', message: "No sets provided to save." });
      }

      const setsCollection = db.collection('pokemon-tcg-sets');
      const batch = db.batch();
      
      sets.forEach((set: any) => {
        if (set && set.id) {
          const docRef = setsCollection.doc(set.id);
          batch.set(docRef, {
            ...set,
            lastSynced: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      });

      await batch.commit();
      return NextResponse.json({ 
        status: 'success', 
        count: sets.length, 
        message: `Successfully saved ${sets.length} sets.` 
      });
    }

    // --- LEGACY MODE ---
    const response = await axios.get(POKEMON_TCG_API_SETS, {
      headers: { 'X-Api-Key': apiKey },
      timeout: 50000,
    });

    const validSets = (response.data?.data || []).filter((s: any) => s && s.id);
    const setsCollection = db.collection('pokemon-tcg-sets');
    
    const batch = db.batch();
    validSets.forEach((set: any) => {
      batch.set(setsCollection.doc(set.id), {
        ...set,
        lastSynced: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });
    
    await batch.commit();
    return NextResponse.json({ status: 'success', count: validSets.length, logs });

  } catch (error: any) {
    console.error('Error in sync-sets:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: error.message || 'An unknown error occurred.',
      logs 
    });
  }
}
