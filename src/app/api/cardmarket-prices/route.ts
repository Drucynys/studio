
import { NextResponse } from 'next/server';
import type { CardmarketPriceGuide, CardmarketProduct } from '@/types';

// URL for the Cardmarket Pokémon TCG price guide (price_guide_6.json)
const CARDMARKET_PRICE_GUIDE_URL = 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json';

// Cache duration: 1 hour (in milliseconds)
const CACHE_DURATION_MS = 60 * 60 * 1000;

let cachedData: CardmarketPriceGuide | null = null;
let lastFetchTimestamp = 0;

export async function GET() {
  const now = Date.now();

  // Serve from cache if data is fresh
  if (cachedData && (now - lastFetchTimestamp < CACHE_DURATION_MS)) {
    return NextResponse.json(cachedData);
  }

  try {
    const response = await fetch(CARDMARKET_PRICE_GUIDE_URL, {
      // next: { revalidate: CACHE_DURATION_MS / 1000 } // Revalidate every hour
      // Using simple time-based cache for broader compatibility, revalidate can be used too.
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Cardmarket price guide from S3: ${response.statusText} (status: ${response.status})`);
    }

    const responseData = await response.json();

    if (!Array.isArray(responseData)) {
      console.error("Cardmarket price guide data from S3 is not an array. Received:", JSON.stringify(responseData, null, 2));
      throw new Error('Cardmarket price guide data format is not an array. The fetched data from S3 was not a JSON array as expected.');
    }
    
    const rawData: any[] = responseData;
    
    // Transform raw data to match our CardmarketProduct structure
    // The actual JSON has keys like "Product ID", "Product", "Expansion", "Low Price", etc.
    const processedData: CardmarketPriceGuide = rawData.map(item => ({
      idProduct: item["Product ID"],
      Name: item["Product"],
      Expansion: item["Expansion"],
      Number: item["Number"], // Assuming 'Number' key exists
      Rarity: item["Rarity"], // Assuming 'Rarity' key exists
      "Low Price": item["Low Price"],
      "Trend Price": item["Trend Price"],
      "Average Sell Price": item["Average Sell Price"],
      "7-days Average Price": item["7-days Average Price"],
      "30-days Average Price": item["30-days Average Price"],
      "Trend Price Foil": item["Trend Price Foil"],
      "Average Sell Price Foil": item["Average Sell Price Foil"],
      "7-days Average Price Foil": item["7-days Average Price Foil"],
      "30-days Average Price Foil": item["30-days Average Price Foil"],
    })).filter(p => p.Name && p.Expansion); // Ensure essential fields are present

    cachedData = processedData;
    lastFetchTimestamp = now;

    return NextResponse.json(cachedData);
  } catch (error) {
    console.error("Error in /api/cardmarket-prices route:", error);
    // Optionally, return stale cache if available during an error
    if (cachedData) {
      // Log that stale data is being served
      console.warn("Serving stale Cardmarket price guide due to fetch error.");
      return NextResponse.json(cachedData);
    }
    return NextResponse.json(
      { message: 'Error fetching or processing Cardmarket price guide', error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
