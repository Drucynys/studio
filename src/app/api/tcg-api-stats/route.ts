import { NextResponse } from 'next/server';
import axios from 'axios';

const POKEMON_TCG_API_BASE = 'https://api.pokemontcg.io/v2/cards';

export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ status: 'error', message: "Pokémon TCG API key is missing." });
    }

    const response = await axios.get(POKEMON_TCG_API_BASE, {
      timeout: 30000,
      headers: { 
        'X-Api-Key': apiKey,
        'User-Agent': 'PokéTRKR/1.0'
      },
      params: { pageSize: 1 }
    });

    const totalCount = response.data.totalCount;

    if (typeof totalCount !== 'number') {
        return NextResponse.json({ status: 'error', message: 'Could not retrieve total card count from the API response.' });
    }

    return NextResponse.json({ status: 'success', totalCount });

  } catch (error: any) {
    const status = error.response?.status || 'Unknown';
    console.error(`Error fetching TCG API stats (${status}):`, error.message);
    return NextResponse.json({ 
      status: 'error', 
      message: `TCG API Error (${status}): ${error.message}` 
    });
  }
}
