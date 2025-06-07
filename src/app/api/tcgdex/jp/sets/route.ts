
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // This is the target API endpoint we want to fetch from
    const TCGDEX_JAPANESE_SETS_URL = "https://api.tcgdex.dev/v2/jp/sets";
    
    const response = await fetch(TCGDEX_JAPANESE_SETS_URL, { cache: 'no-store' });

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
    let detailedErrorMessage = "An unknown error occurred while fetching Japanese sets via proxy.";
    if (error instanceof Error) {
      detailedErrorMessage = error.message;
    }
    // Log the full error object for server-side inspection, this is crucial for "fetch failed" errors
    console.error("Error in /api/tcgdex/jp/sets proxy route:", error); 
    
    return NextResponse.json(
      { message: 'Error fetching Japanese sets via proxy', error: detailedErrorMessage },
      { status: 500 }
    );
  }
}

