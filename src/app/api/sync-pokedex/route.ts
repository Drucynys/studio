
import { NextResponse } from 'next/server';
import axios from 'axios';
import { dbAdmin } from '@/lib/firebase-admin';

const POKEDEX_COLLECTION = 'pokedex';
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
const TOTAL_GENERATIONS = 9; // As of now, there are 9 generations

export async function POST() {
    const logs: string[] = ["- Starting Full Pokédex Data Sync -"];
    try {
        logs.push("✅ Firebase Admin SDK initialized.");

        const allPokemonMap = new Map();

        for (let i = 1; i <= TOTAL_GENERATIONS; i++) {
            logs.push(`Fetching data for Generation ${i}...`);
            const generationResponse = await axios.get(`${POKEAPI_BASE_URL}/generation/${i}`);
            const pokemonSpecies = generationResponse.data.pokemon_species;

            logs.push(`Processing ${pokemonSpecies.length} Pokémon species from Generation ${i}.`);

            for (const species of pokemonSpecies) {
                const urlParts = species.url.split('/');
                const id = parseInt(urlParts[urlParts.length - 2]);

                if (!allPokemonMap.has(id)) {
                    allPokemonMap.set(id, {
                        id: id,
                        name: species.name,
                        // Construct the sprite URL directly to avoid extra API calls
                        sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
                        generation: i,
                    });
                }
            }
        }
        
        const pokedexData = Array.from(allPokemonMap.values()).sort((a,b) => a.id - b.id);
        logs.push(`✅ Fetched and processed a total of ${pokedexData.length} unique Pokémon across all generations.`);


        logs.push(`Writing ${pokedexData.length} Pokémon to the '${POKEDEX_COLLECTION}' collection...`);
        const pokedexCollection = dbAdmin.collection(POKEDEX_COLLECTION);
        const batch = dbAdmin.batch();
        let pokemonWritten = 0;

        pokedexData.forEach((pokemon: any) => {
            if (pokemon && pokemon.name && pokemon.id) {
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
