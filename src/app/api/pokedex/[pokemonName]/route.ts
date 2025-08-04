
import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';

export async function GET(request: Request, { params }: { params: { pokemonName: string } }) {
    const { pokemonName } = params;
    if (!pokemonName) {
        return NextResponse.json({ message: 'Pokémon name is required' }, { status: 400 });
    }

    try {
        const pokedexRef = dbAdmin.collection('pokedex');
        
        // Query the collection for a document where the 'name' field matches the parameter
        const q = pokedexRef.where('name', '==', pokemonName.toLowerCase());
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            return NextResponse.json({ message: 'Pokémon not found in database' }, { status: 404 });
        }

        // Assuming names are unique, there should be only one document
        const pokemonData = querySnapshot.docs[0].data();
        return NextResponse.json(pokemonData);

    } catch (error: any) {
        console.error(`Error fetching Pokémon details for ${pokemonName}:`, error);
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
