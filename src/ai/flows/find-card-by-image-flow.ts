
'use server';
/**
 * @fileOverview An AI agent to identify Pokémon card details from an image.
 *
 * - findCardByImage - A function that handles the card identification process.
 * - FindCardInput - The input type for the findCardByImage function.
 * - FindCardOutput - The return type for the findCardByImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FindCardInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a Pokémon card, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type FindCardInput = z.infer<typeof FindCardInputSchema>;

const FindCardOutputSchema = z.object({
  name: z.string().optional().describe('The name of the Pokémon card. Extract the main Pokémon name, excluding V, VMAX, VSTAR, ex, GX, Radiant, Tera etc. if they are part of a larger title phrase. E.g., for "Pikachu VMAX", return "Pikachu". For "Radiant Greninja", return "Greninja".'),
  set: z.string().optional().describe("The name of the card's set (e.g., 'Scarlet & Violet', '151', 'Temporal Forces')."),
  cardNumber: z.string().optional().describe('The card number, including any prefixes or suffixes (e.g., "025/198", "SV001", "TG05/TG30").'),
  rarity: z.string().optional().describe('The rarity of the card (e.g., "Common", "Ultra Rare", "Illustration Rare", "Promo"). If a symbol like C, U, R is present near the card number, use that to infer Common, Uncommon, Rare.'),
});
export type FindCardOutput = z.infer<typeof FindCardOutputSchema>;

export async function findCardByImage(input: FindCardInput): Promise<FindCardOutput> {
  return findCardFlow(input);
}

const findCardPrompt = ai.definePrompt({
  name: 'findCardPrompt',
  input: {schema: FindCardInputSchema},
  output: {schema: FindCardOutputSchema},
  prompt: `You are an expert Pokémon TCG card identifier. Analyze the provided image of a Pokémon card.
You must extract the following details if they are clearly visible on the card:

1.  **Card Name**: Identify the main name of the Pokémon. For example, if the card says "Pikachu VMAX", the Card Name is "Pikachu". If it says "Radiant Greninja", the Card Name is "Greninja". If it's "Professor's Research (Professor Sada)", the Card Name is "Professor's Research".
2.  **Set Name**: Identify the name of the expansion set the card belongs to. This is often found near the card number or a set symbol. Examples: "Obsidian Flames", "Crown Zenith", "Pokémon GO".
3.  **Card Number**: Identify the collector number of the card, typically in a format like "001/165", "123/XY-P", "SV001", "TG01/TG30", or "H30/H32". Include any letters or symbols that are part of the number.
4.  **Rarity**: Determine the card's rarity. Look for explicit rarity text (e.g., "PROMO", "Illustration Rare") or symbols (like a circle for Common, diamond for Uncommon, star for Rare) often found near the card number or set information.

If a detail is not clearly visible or cannot be confidently identified from the image, please omit that field or return an empty string for it. Focus on accuracy.

Image of the card:
{{media url=imageDataUri}}
`,
});

const findCardFlow = ai.defineFlow(
  {
    name: 'findCardFlow',
    inputSchema: FindCardInputSchema,
    outputSchema: FindCardOutputSchema,
  },
  async (input: FindCardInput) => {
    const {output} = await findCardPrompt(input);
    // Ensure that if a field is an empty string from the model, it becomes undefined to match optional Zod schema behavior.
    return {
      name: output?.name?.trim() || undefined,
      set: output?.set?.trim() || undefined,
      cardNumber: output?.cardNumber?.trim() || undefined,
      rarity: output?.rarity?.trim() || undefined,
    };
  }
);
