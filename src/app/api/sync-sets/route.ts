import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase-admin';
import axios from 'axios';

const POKEMON_TCG_API_SETS = 'https://api.pokemontcg.io/v2/sets';

/**
 * Handles Set Discovery and Saving in a granular way to prevent timeouts.
 * Supported actions:
 * - 'discover': Proxies a paged request to the TCG API.
 * - 'save': Saves a provided list of sets to Firestore.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const logs: string[] = [];

  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'legacy', page = 1, pageSize = 25, sets = [] } = body;

    const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ status: 'error', message: 'Missing API Key', logs });
    }

    // --- ACTION: DISCOVER (Proxy to TCG API) ---
    if (action === 'discover') {
      try {
        console.log(`[Backend] Discovering sets: Page ${page}, Size ${pageSize}`);

        const response = await axios.get(POKEMON_TCG_API_SETS, {
          timeout: 50000,
          headers: {
            'X-Api-Key': apiKey,
            'User-Agent': 'PokéTRKR/1.0',
          },
          params: { page, pageSize },
        });

        return NextResponse.json({
          status: 'success',
          data: response.data.data,
          totalCount: response.data.totalCount,
          page: response.data.page,
          pageSize: response.data.pageSize,
        });
      } catch (apiError: any) {
        const status = apiError.response?.status || 'Unknown';
        const errorData = apiError.response?.data
          ? JSON.stringify(apiError.response.data).substring(0, 100)
          : apiError.message;
        console.error(`[Backend] TCG API Error (${status}):`, errorData);
        return NextResponse.json({
          status: 'error',
          message: `External API Error (${status}): ${errorData}`,
        });
      }
    }

    // --- ACTION: SAVE (Write provided sets to Firestore) ---
    if (action === 'save') {
      if (!Array.isArray(sets) || sets.length === 0) {
        return NextResponse.json({ status: 'noop', message: 'No sets provided to save.' });
      }

      const setsCollection = db.collection('pokemon-tcg-sets');
      const batch = db.batch();

      sets.forEach((set: any) => {
        if (set && set.id) {
          const docRef = setsCollection.doc(set.id);
          batch.set(
            docRef,
            {
              ...set,
              lastSynced: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      });

      await batch.commit();
      return NextResponse.json({
        status: 'success',
        count: sets.length,
        message: `Successfully saved ${sets.length} sets.`,
      });
    }

    return NextResponse.json({ status: 'error', message: 'Unsupported action.' });
  } catch (error: any) {
    console.error('Fatal error in sync-sets:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'An unknown error occurred.',
      logs,
    });
  }
}
