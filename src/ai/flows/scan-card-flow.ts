
'use server';
/**
 * @fileOverview A Pokémon card scanning AI agent.
 *
 * - scanCard - A function that handles the card scanning process.
 * - ScanCardInput - The input type for the scanCard function.
 * - ScanCardOutput - The return type for the scanCard function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScanCardInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a Pokémon card, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanCardInput = z.infer<typeof ScanCardInputSchema>;

const ScanCardOutputSchema = z.object({
  name: z.string().optional().describe("The name of the Pokémon card."),
  set: z.string().optional().describe("The name of the Pokémon TCG set the card belongs to."),
  cardNumber: z.string().optional().describe("The card number, including any prefixes/suffixes (e.g., '12/102', 'SWSH123', 'TG05/TG30')."),
  rarity: z.string().optional().describe("The rarity of the card (e.g., Common, Uncommon, Rare, Holo Rare, Ultra Rare)."),
  isPokemonCard: z.boolean().describe("Set to true if the image is identified as a Pokémon TCG card, false otherwise."),
  error: z.string().optional().describe("Any error message if identification fails or it's not a Pokémon card.")
});
export type ScanCardOutput = z.infer<typeof ScanCardOutputSchema>;

export async function scanCard(input: ScanCardInput): Promise<ScanCardOutput> {
  return scanCardFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scanCardPrompt',
  input: {schema: ScanCardInputSchema},
  output: {schema: ScanCardOutputSchema, format: 'json'}, // Request JSON output
  prompt: `You are an expert Pokémon TCG card identifier. Analyze the provided image. Your goal is to extract specific details from the Pokémon card.
Respond in JSON format matching the provided schema.

If the image is clearly a Pokémon TCG card, extract the following details:
- name: The full name of the Pokémon or card.
- set: The official English name of the expansion set.
- cardNumber: The collector number of the card, exactly as it appears (e.g., "101/165", "SWSH001", "TG14/TG30").
- rarity: The card's rarity (e.g., Common, Uncommon, Rare, Holo Rare, Ultra Rare, Secret Rare, Amazing Rare, Radiant).
- isPokemonCard: Set this to true.

If any specific detail is unreadable or not present, omit that field or set it to null in the JSON.
If the image is not a Pokémon TCG card, or if it's completely unreadable, set 'isPokemonCard' to false and provide a brief 'error' message explaining why (e.g., "Image is not a Pokémon card.", "Card details are unreadable.").

Image: {{media url=imageDataUri}}`,
  config: {
    temperature: 0.2, // Lower temperature for more deterministic output
     safetySettings: [ // Adjust safety settings if needed for card images
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  }
});

const scanCardFlow = ai.defineFlow(
  {
    name: 'scanCardFlow',
    inputSchema: ScanCardInputSchema,
    outputSchema: ScanCardOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        return { isPokemonCard: false, error: "No response from AI model." };
    }
    // Ensure isPokemonCard has a default value if not provided by LLM
    if (typeof output.isPokemonCard === 'undefined') {
        if (output.name || output.set || output.cardNumber) {
            output.isPokemonCard = true; // Infer it's a pokemon card if other details are present
        } else {
            output.isPokemonCard = false;
            if (!output.error) {
                output.error = "Could not determine if image is a Pokémon card.";
            }
        }
    }
    return output;
  }
);

