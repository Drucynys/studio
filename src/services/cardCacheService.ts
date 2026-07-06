// src/services/cardCacheService.ts
import { openDB, type IDBPDatabase } from 'idb';

// Define the structure of our database entities
// These align with the API responses for consistency
interface ApiSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: {
    symbol: string;
    logo: string;
  };
}

interface ApiPokemonCard {
  id: string;
  name: string;
  set: {
    id: string;
    name: string;
  };
  number: string;
  // Add other relevant card properties
}

const DB_NAME = 'pokedex-tracker-db';
const DB_VERSION = 1;
const SETS_STORE = 'sets';
const CARDS_STORE = 'cards';

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = () => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create 'sets' store if it doesn't exist
      if (!db.objectStoreNames.contains(SETS_STORE)) {
        // The key will be the set 'id' (e.g., "sv1", "base1")
        db.createObjectStore(SETS_STORE, { keyPath: 'id' });
      }

      // Create 'cards' store if it doesn't exist
      if (!db.objectStoreNames.contains(CARDS_STORE)) {
        const store = db.createObjectStore(CARDS_STORE, { keyPath: 'id' });
        // Create an index on 'set.id' to easily fetch all cards for a given set
        store.createIndex('by-set', 'set.id');
      }
    },
  });
  return dbPromise;
};

// --- Service Functions ---

// Example function to get all sets from the cache
export async function getCachedSets(): Promise<ApiSet[]> {
  const db = await initDB();
  return db.getAll(SETS_STORE);
}

// Example function to save sets to the cache
export async function cacheSets(sets: ApiSet[]): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(SETS_STORE, 'readwrite');
  await Promise.all(sets.map((set) => tx.store.put(set)));
  await tx.done;
}

// Example function to get cards for a specific set from the cache
export async function getCachedCardsBySet(setId: string): Promise<ApiPokemonCard[]> {
  const db = await initDB();
  return db.getAllFromIndex(CARDS_STORE, 'by-set', setId);
}

// Example function to save cards to the cache
export async function cacheCards(cards: ApiPokemonCard[]): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(CARDS_STORE, 'readwrite');
  await Promise.all(cards.map((card) => tx.store.put(card)));
  await tx.done;
}

// Initialize the database as soon as the app loads
initDB();
