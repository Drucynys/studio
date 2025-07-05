
import { NextResponse } from 'next/server';
import axios from 'axios';
import JSZip from 'jszip';

export async function GET() {
  const logs: string[] = [];

  try {
    logs.push("Starting data export process...");

    // Check for Pokémon TCG API Key
    const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
    if (!apiKey) {
      throw new Error("Pokémon TCG API key is missing. Please add NEXT_PUBLIC_POKEMONTCG_API_KEY to your .env file.");
    }
    logs.push("Pokémon TCG API key found.");

    // Fetch all sets data from Pokémon TCG API
    logs.push("Fetching all sets from Pokémon TCG API...");
    const response = await axios.get('https://api.pokemontcg.io/v2/sets', {
      headers: { 'X-Api-Key': apiKey }
    });
    
    const sets = response.data.data;
    if (!sets || sets.length === 0) {
      throw new Error("No sets found from API.");
    }
    logs.push(`Found ${sets.length} sets.`);

    // Create a zip file in memory
    const zip = new JSZip();
    
    // Add the sets data as a JSON file to the zip
    zip.file("pokemon_tcg_sets.json", JSON.stringify(sets, null, 2));
    logs.push("Added sets data to pokemon_tcg_sets.json");
    
    // Generate the zip file as a buffer
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    logs.push("Generated zip buffer.");

    // Return the zip file as a response
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="pokemon_tcg_sets.zip"`,
      },
    });

  } catch (error: any) {
    console.error('Error during data export API route:', error);
    const errorMessage = error.message || 'An unknown error occurred on the server.';
    logs.push(`❌ FATAL ERROR: ${errorMessage}`);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: errorMessage, 
        logs 
      }, 
      { status: 500 }
    );
  }
}
