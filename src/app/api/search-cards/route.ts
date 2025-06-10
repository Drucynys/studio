import { NextResponse, NextRequest } from 'next/server';

// Assuming a function exists or will be created to interact with an external API
// For demonstration, this is a placeholder function.
// You would replace this with actual API calls to TCGdex or another service.
async function searchPokemonCards(query: { name?: string; set?: string; cardNumber?: string }): Promise<any[]> {
  const queryParts: string[] = [];

  if (query.name) {
    queryParts.push(`name:"${query.name}"`); // Use exact match for name
  }
  if (query.set) {
    // Search both set ID and set name for flexibility
    queryParts.push(`(set.id:${query.set} OR set.name:"${query.set}")`);
  }
  if (query.cardNumber) {
    queryParts.push(`number:${query.cardNumber}`);
  }

  const queryString = queryParts.join(' '); // Combine query parts with space

  if (!queryString) {
    return []; // Return empty array if no search criteria
  }

  const apiUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(queryString)}`;

  const response = await fetch(apiUrl);
  const data = await response.json();

  return data.data || []; // Return the data array, or an empty array if no data

}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name') || undefined;
    const set = searchParams.get('set') || undefined;
    const cardNumber = searchParams.get('cardNumber') || undefined;

    // Validate that at least one search parameter is provided
    if (!name && !set && !cardNumber) {
      return NextResponse.json(
        { message: 'Please provide at least one search parameter (name, set, or cardNumber).' },
        { status: 400 }
      );
    }

    const matchingCards = await searchPokemonCards({ name, set, cardNumber });

    return NextResponse.json(matchingCards);

  } catch (error) {
    console.error('Error searching for cards:', error);
    return NextResponse.json(
      { message: 'Error searching for cards', error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}