
import { NextResponse } from 'next/server';
import axios from 'axios';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const POKEDEX_COLLECTION = 'pokedex';
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
const POKEMON_LIMIT = 151; // Gen 1

// Safe initialization function
function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return;
    }
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!serviceAccountJson || !projectId) {
        throw new Error("Firebase credentials or Project ID are not set in environment variables.");
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
    });
}

export async function POST() {
    const logs: string[] = ["- Starting Pokédex Data Sync -"];
    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        logs.push("✅ Firebase Admin SDK initialized.");

        logs.push(`Fetching list of ${POKEMON_LIMIT} Pokémon from PokeAPI...`);
        const listResponse = await axios.get(`${POKEAPI_BASE_URL}/pokemon?limit=${POKEMON_LIMIT}`);
        const pokemonList = listResponse.data.results;
        logs.push(`✅ Found ${pokemonList.length} Pokémon to process.`);

        const pokedexPromises = pokemonList.map(async (pokemon: any) => {
            try {
                const detailResponse = await axios.get(pokemon.url);
                const { id, name, sprites } = detailResponse.data;
                return { id, name, sprite: sprites.front_default };
            } catch (error) {
                logs.push(`⚠️ Could not fetch details for ${pokemon.name}. Skipping.`);
                return null;
            }
        });

        const pokedexData = (await Promise.all(pokedexPromises)).filter(p => p !== null);
        
        logs.push(`✅ Fetched details for ${pokedexData.length} Pokémon.`);

        logs.push(`Writing ${pokedexData.length} Pokémon to the '${POKEDEX_COLLECTION}' collection...`);
        const pokedexCollection = db.collection(POKEDEX_COLLECTION);
        const batch = db.batch();
        let pokemonWritten = 0;

        pokedexData.forEach((pokemon: any) => {
            if (pokemon && pokemon.name && pokemon.id) {
                // Use the pokemon's numeric ID as a string for the document ID
                const docRef = pokedexCollection.doc(String(pokemon.id));
                batch.set(docRef, pokemon);
                pokemonWritten++;
            } else {
                logs.push(`Skipping a Pokémon due to missing name or ID.`);
            }
        });

        await batch.commit();
        const successMessage = `Successfully synced ${pokemonWritten} Pokémon to Firestore.`;
        logs.push("✅ " + successMessage);

        return NextResponse.json({ status: 'success', count: pokemonWritten, logs });

    } catch (error: any) {
        console.error('Error during Pokédex sync:', error);
        const errorMessage = error.message || 'An unknown server error occurred.';
        logs.push(`❌ ERROR: ${errorMessage}`);
        
        return NextResponse.json(
          { status: 'error', message: errorMessage, logs }, 
          { status: 500 }
        );
    }
}

    