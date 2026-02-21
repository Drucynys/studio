import { NextResponse } from 'next/server';

const POKEMON_TCG_API_BASE = 'https://api.pokemontcg.io/v2/cards';

export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ status: 'error', message: "Pokémon TCG API key is missing." });
    }

    // We only need the totalCount, so we fetch the smallest possible page size.
    const url = new URL(POKEMON_TCG_API_BASE);
    url.searchParams.append('pageSize', '1');

    const response = await fetch(url.toString(), {
      headers: { 'X-Api-Key': apiKey },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      return NextResponse.json({ status: 'error', message: `TCG API returned status ${response.status}` });
    }

    const data = await response.json();
    const totalCount = data.totalCount;

    if (typeof totalCount !== 'number') {
        return NextResponse.json({ status: 'error', message: 'Could not retrieve total card count from the API response.' });
    }

    return NextResponse.json({ status: 'success', totalCount });

  } catch (error: any) {
    console.error('Error fetching total card count from TCG API:', error);
    const isTimeout = error.name === 'TimeoutError' || error.message?.includes('timeout');
    return NextResponse.json(
      { status: 'error', message: isTimeout ? "API request timed out." : (error.message || 'An unknown server error occurred.') }
    );
  }
}
