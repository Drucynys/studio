import { NextResponse } from 'next/server';
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
    if (action === 'discover') {
      try {
        const url = new URL(POKEMON_TCG_API_SETS);
        url.searchParams.append('page', String(page));
        url.searchParams.append('pageSize', String(pageSize));
        // Removed orderBy to ensure maximum compatibility and speed during discovery

        const response = await fetch(url.toString(), {
          headers: { 'X-Api-Key': apiKey },
          signal: AbortSignal.timeout(50000), // 50s timeout
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`External API Error (${response.status}): ${errorText.substring(0, 100)}`);
        }

        const data = await response.json();

        return NextResponse.json({
          status: 'success',
          data: data.data,
          totalCount: data.totalCount,
          page: data.page,
          pageSize: data.pageSize,
        });
      } catch (apiError: any) {
        const isTimeout = apiError.name === 'TimeoutError' || apiError.message?.includes('timeout');
        const msg = isTimeout ? "The external TCG API timed out." : apiError.message;
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
    const response = await fetch(POKEMON_TCG_API_SETS, {
      headers: { 'X-Api-Key': apiKey },
      signal: AbortSignal.timeout(50000),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    
    const data = await response.json();
    const validSets = (data.data || []).filter((s: any) => s && s.id);
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
