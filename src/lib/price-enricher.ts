import { db } from '@/lib/firebase-admin';

/**
 * Enriches an array of raw card data objects from `pokemon-tcg-cards` with
 * current pricing data stored in the decoupled `card_prices` Firestore collection.
 */
export async function enrichCardsWithPrices(cards: any[]): Promise<any[]> {
  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return cards;
  }

  try {
    const cardIds = new Set<string>();
    const setIds = new Set<string>();

    for (const c of cards) {
      if (!c) continue;
      const docId = c.id || c.apiId;
      if (docId && typeof docId === 'string') {
        cardIds.add(docId);
      }
      if (c.setId && typeof c.setId === 'string') {
        setIds.add(c.setId);
      }
    }

    if (cardIds.size === 0) return cards;

    const priceMap = new Map<string, Record<string, number>>();

    // Strategy 1: If there are <= 3 unique setIds, querying `card_prices` by `setId`
    // fetches all prices for those entire sets in parallel (1 round-trip per set).
    if (setIds.size > 0 && setIds.size <= 3) {
      const snapshots = await Promise.all(
        Array.from(setIds).map((setId) =>
          db.collection('card_prices').where('setId', '==', setId).get()
        )
      );
      for (const snap of snapshots) {
        snap.forEach((doc) => {
          const data = doc.data();
          if (data && data.marketPrices) {
            priceMap.set(doc.id, data.marketPrices);
          }
        });
      }
    } else {
      // Strategy 2: For multi-set searches or arbitrary card lists, fetch by doc ID in chunks of 100 via getAll.
      const idsArray = Array.from(cardIds);
      for (let i = 0; i < idsArray.length; i += 100) {
        const chunkIds = idsArray.slice(i, i + 100);
        const docRefs = chunkIds.map((id) => db.collection('card_prices').doc(id));
        const docs = await db.getAll(...docRefs);
        for (const doc of docs) {
          if (doc.exists) {
            const data = doc.data();
            if (data && data.marketPrices) {
              priceMap.set(doc.id, data.marketPrices);
            }
          }
        }
      }
    }

    // Attach prices to each card
    return cards.map((c) => {
      if (!c) return c;
      const docId = c.id || c.apiId;
      const marketPrices = priceMap.get(docId) || c.cardPrices?.marketPrices;

      if (marketPrices && typeof marketPrices === 'object' && Object.keys(marketPrices).length > 0) {
        const tcgplayerPricing: Record<string, any> = { ...(c.pricing?.tcgplayer || {}) };
        const legacyPrices: Record<string, any> = { ...(c.tcgplayer?.prices || {}) };

        for (const [variantKey, price] of Object.entries(marketPrices)) {
          if (typeof price === 'number' && !isNaN(price)) {
            tcgplayerPricing[variantKey] = { marketPrice: price };
            legacyPrices[variantKey] = { market: price };
          }
        }

        c.pricing = { ...(c.pricing || {}), tcgplayer: tcgplayerPricing };
        c.tcgplayer = { ...(c.tcgplayer || {}), prices: legacyPrices };
        c.cardPrices = { marketPrices };
      }
      return c;
    });
  } catch (error) {
    console.error('[price-enricher] Error enriching cards with card_prices:', error);
    return cards;
  }
}

/**
 * Enriches a single card data object with current pricing from `card_prices`.
 */
export async function enrichSingleCardWithPrices(card: any): Promise<any> {
  if (!card) return card;
  const enriched = await enrichCardsWithPrices([card]);
  return enriched[0] || card;
}
