import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase-admin';
import axios from 'axios';

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
    const { action = 'legacy', page = 1, pageSize = 25, sets = [], language = 'en' } = body;

    const TCGDEX_API_SETS = `https://api.tcgdex.net/v2/${language}/sets`;

    // --- ACTION: DISCOVER (Proxy to TCGdex API) ---
    if (action === 'discover') {
      try {
        console.log(`[Backend] Discovering sets via TCGdex (${language}): Page ${page}, Size ${pageSize}`);

        const response = await axios.get(TCGDEX_API_SETS, {
          timeout: 50000,
          headers: {
            'User-Agent': 'PokéTRKR/1.0',
          },
        });

        // TCGdex returns an array directly. We handle manual pagination.
        const allSets = response.data || [];
        
        // Filter out Pocket sets completely before pagination so they are never synced
        const validSets = allSets.filter((s: any) => {
          const logo = (s.logo || '').toLowerCase();
          const symbol = (s.symbol || '').toLowerCase();
          const id = (s.id || '').toLowerCase();
          const isPocketId = id === 'a1' || id === 'a1a' || id === 'a2' || id === 'a3' || id === 'a4' || id === 'p-a' || id === 'b1' || id === 'b2' || id === 'tcgp' ||
                             id.endsWith('-a1') || id.endsWith('-a1a') || id.endsWith('-a2') || id.endsWith('-a3') || id.endsWith('-a4') || id.endsWith('-p-a') || id.endsWith('-b1') || id.endsWith('-b2') || id.endsWith('-tcgp');
          return !(logo.includes('/tcgp/') || symbol.includes('/tcgp/') || isPocketId);
        });

        const totalCount = validSets.length;
        
        const startIndex = (page - 1) * pageSize;
        const paginatedSets = validSets.slice(startIndex, startIndex + pageSize);

        // Append language to each set so frontend can filter
        const mappedSets = paginatedSets.map((s: any) => ({ ...s, language }));

        return NextResponse.json({
          status: 'success',
          data: mappedSets,
          totalCount: totalCount,
          page: page,
          pageSize: pageSize,
        });
      } catch (apiError: any) {
        const status = apiError.response?.status || 'Unknown';
        const errorData = apiError.response?.data
          ? JSON.stringify(apiError.response.data).substring(0, 100)
          : apiError.message;
        console.error(`[Backend] TCGdex API Error (${status}):`, errorData);
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
          // Append the language to the document ID to prevent overwrites across languages
          // if TCGdex ever uses same ID for different langs, though usually they differ.
          const docRef = setsCollection.doc(`${set.language || language}-${set.id}`);
          batch.set(
            docRef,
            {
              ...set,
              language: set.language || language,
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
