
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
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Cardmarket price guide from S3: ${response.statusText} (status: ${response.status})`);
    }

    const responseData = await response.json();
    
    let actualArrayData: any[] | null = null;

    if (Array.isArray(responseData)) {
      actualArrayData = responseData;
    } else if (typeof responseData === 'object' && responseData !== null) {
      // Check for common wrapper object patterns
      if (Array.isArray(responseData.data)) {
        actualArrayData = responseData.data;
      } else if (Array.isArray(responseData.products)) {
        actualArrayData = responseData.products;
      } else if (Array.isArray(responseData.items)) {
        actualArrayData = responseData.items;
      } else {
        // Last resort: try to find any top-level property that is an array
        for (const key in responseData) {
          if (Object.prototype.hasOwnProperty.call(responseData, key) && Array.isArray(responseData[key])) {
            console.warn(`Cardmarket API: Found array in unexpected property '${key}'. Using this array.`);
            actualArrayData = responseData[key];
            break; // Use the first one found
          }
        }
      }
    }

    if (!actualArrayData) {
      console.error("Cardmarket price guide data from S3 is not in a recognized array format. Received:", JSON.stringify(responseData, null, 2));
      throw new Error('Cardmarket price guide data format is not an array or a recognized wrapped array. The fetched data from S3 was not in the expected format.');
    }
    
    const rawData: any[] = actualArrayData;
    
    // Transform raw data to match our CardmarketProduct structure
    const processedData: CardmarketPriceGuide = rawData.map(item => {
      if (typeof item !== 'object' || item === null) {
        console.warn("Cardmarket API: Skipping non-object item in price data:", item);
        return null; // Will be filtered out later
      }
      return {
        idProduct: item["Product ID"],
        Name: item["Product"],
        Expansion: item["Expansion"],
        Number: item["Number"], 
        Rarity: item["Rarity"],
        "Low Price": item["Low Price"],
        "Trend Price": item["Trend Price"],
        "Average Sell Price": item["Average Sell Price"],
        "7-days Average Price": item["7-days Average Price"],
        "30-days Average Price": item["30-days Average Price"],
        "Trend Price Foil": item["Trend Price Foil"],
        "Average Sell Price Foil": item["Average Sell Price Foil"],
        "7-days Average Price Foil": item["7-days Average Price Foil"],
        "30-days Average Price Foil": item["30-days Average Price Foil"],
      };
    }).filter(p => {
        if (!p) return false; // Filter out nulls from skipped non-object items
        if (!(p.Name && p.Expansion)) {
            // console.warn("Cardmarket API: Skipping product due to missing Name or Expansion:", p);
            return false;
        }
        return true;
    });


    cachedData = processedData;
    lastFetchTimestamp = now;

    return NextResponse.json(cachedData);
  } catch (error) {
    console.error("Error in /api/cardmarket-prices route:", error);
    if (cachedData) {
      console.warn("Serving stale Cardmarket price guide due to fetch error.");
      return NextResponse.json(cachedData);
    }
    return NextResponse.json(
      { message: 'Error fetching or processing Cardmarket price guide', error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
