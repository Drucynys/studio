import { NextResponse, NextRequest } from 'next/server';

async function searchPokemonCards(rawQuery: string): Promise<any[]> {
  const query = rawQuery.trim();
  if (!query) {
    return [];
  }

  // Split the query into parts that are numbers and parts that are words
  const parts = query.toLowerCase().split(/\s+/);
  const numbers = parts.filter(p => /^\d+$/.test(p) && p.length < 5); // Card numbers are not usually long
  const words = parts.filter(p => !/^\d+$/.test(p) || p.length >= 5);

  const apiQueryParts: string[] = [];

  // Each word acts as a fuzzy match against name OR set name
  if (words.length > 0) {
    const wordQueries = words.map(word => `(name:"${word}*" OR set.name:"${word}*")`);
    apiQueryParts.push(`(${wordQueries.join(' AND ')})`);
  }
  
  // The last number found is treated as the card number
  if (numbers.length > 0) {
    apiQueryParts.push(`number:${numbers[numbers.length - 1]}`);
  }

  const queryString = apiQueryParts.join(' ');
  
  if (!queryString) {
    return [];
  }

  // The API key is required for requests to pokemontcg.io
  const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
  if (!apiKey) {
    throw new Error("Pokémon TCG API key is missing from environment variables.");
  }
  const headers: HeadersInit = { 'X-Api-Key': apiKey };

  const apiUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(queryString)}&orderBy=set.releaseDate,number`;
  
  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    console.error(`Pokemon TCG API Error: ${response.status} ${response.statusText}`);
    // Do not throw, just return empty so the UI can handle it gracefully.
    return [];
  }
  const data = await response.json();
  return data.data || [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q) {
      return NextResponse.json(
        { message: 'Please provide a search query.' },
        { status: 400 }
      );
    }

    const matchingCards = await searchPokemonCards(q);

    return NextResponse.json(matchingCards);

  } catch (error) {
    console.error('Error in search-cards API route:', error);
    return NextResponse.json(
      { message: 'Error searching for cards', error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
