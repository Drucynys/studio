
import { NextResponse } from 'next/server';
import axios from 'axios';

const POKEMON_TCG_API_BASE = 'https://api.pokemontcg.io/v2/cards';

export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
    if (!apiKey) {
      throw new Error("Pokémon TCG API key is missing.");
    }

    // We only need the totalCount, so we fetch the smallest possible page size.
    const response = await axios.get(POKEMON_TCG_API_BASE, {
      headers: { 'X-Api-Key': apiKey },
      params: {
        pageSize: 1,
      },
    });

    const totalCount = response.data.totalCount;

    if (typeof totalCount !== 'number') {
        throw new Error('Could not retrieve total card count from the API response.');
    }

    return NextResponse.json({ totalCount });

  } catch (error: any) {
    console.error('Error fetching total card count from TCG API:', error);
    return NextResponse.json(
      { message: error.message || 'An unknown error occurred while fetching API stats.' },
      { status: 500 }
    );
  }
}
