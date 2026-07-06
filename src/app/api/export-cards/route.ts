import { NextResponse } from 'next/server';
import axios from 'axios';
import JSZip from 'jszip';

const POKEMON_TCG_API_BASE = 'https://api.pokemontcg.io/v2/cards';
const PAGE_SIZE = 250; // Max page size allowed by API

export async function GET() {
  const logs: string[] = [];

  try {
    logs.push('Starting card data export process...');

    const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
    if (!apiKey) {
      throw new Error('Pokémon TCG API key is missing.');
    }
    logs.push('Pokémon TCG API key found.');

    let allCards: any[] = [];
    let page = 1;
    let hasMore = true;
    let totalCount = 0;

    logs.push('Fetching all cards from Pokémon TCG API... This may take several minutes.');

    while (hasMore) {
      console.log(`Fetching page ${page}...`);
      const response = await axios.get(POKEMON_TCG_API_BASE, {
        headers: { 'X-Api-Key': apiKey },
        params: {
          page: page,
          pageSize: PAGE_SIZE,
        },
      });

      const { data, count, totalCount: apiTotalCount } = response.data;
      if (!data || data.length === 0) {
        hasMore = false;
        continue;
      }

      allCards = allCards.concat(data);
      totalCount = apiTotalCount;
      console.log(`Fetched page ${page}. Total cards so far: ${allCards.length} / ${totalCount}`);

      if (allCards.length >= totalCount) {
        hasMore = false;
      } else {
        page++;
      }
    }

    if (allCards.length === 0) {
      throw new Error('No cards found from API.');
    }
    logs.push(`Finished fetching. Total cards found: ${allCards.length}.`);

    const zip = new JSZip();
    zip.file('pokemon_tcg_cards.json', JSON.stringify(allCards, null, 2));
    logs.push('Added cards data to pokemon_tcg_cards.json.');

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    logs.push('Generated zip buffer.');

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="pokemon_tcg_cards.zip"`,
      },
    });
  } catch (error: any) {
    console.error('Error during card data export API route:', error);
    const errorMessage = error.message || 'An unknown error occurred on the server.';
    logs.push(`❌ FATAL ERROR: ${errorMessage}`);

    return NextResponse.json(
      {
        status: 'error',
        message: errorMessage,
        logs,
      },
      { status: 500 }
    );
  }
}
