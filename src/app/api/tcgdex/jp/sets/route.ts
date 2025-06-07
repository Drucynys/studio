
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // This is the target API endpoint we want to fetch from
    const TCGDEX_JAPANESE_SETS_URL = "https://api.tcgdex.dev/v2/jp/sets";
    
    const response = await fetch(TCGDEX_JAPANESE_SETS_URL);

    if (!response.ok) {
      // Attempt to get more detailed error information from the TCGdex API response
      let errorBody = `Status: ${response.status}, StatusText: ${response.statusText}`;
      try {
        const apiError = await response.json(); // Or response.text() if it's not JSON
        errorBody += `, Body: ${JSON.stringify(apiError)}`;
      } catch (e) {
        // If parsing error body fails, just use what we have
      }
      console.error(`Error fetching from TCGdex API: ${errorBody}`);
      throw new Error(`Failed to fetch Japanese sets from TCGdex API. ${errorBody}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error in /api/tcgdex/jp/sets proxy route:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching Japanese sets via proxy.";
    return NextResponse.json(
      { message: 'Error fetching Japanese sets via proxy', error: errorMessage },
      { status: 500 }
    );
  }
}
