// File: src/ai/flows/find-card-by-image-flow.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FindCardInputSchema = z.object({
  imageDataUri: z.string().describe('The image of the Pokemon card as a data URI.'),
});
export type FindCardInput = z.infer<typeof FindCardInputSchema>;

const FindCardOutputSchema = z.object({
  name: z.string().optional().describe('The name of the Pokemon.'),
  set: z.string().optional().describe('The name of the expansion set.'),
  cardNumber: z.string().optional().describe('The collector number (e.g. 4/102 or SWSH001).'),
  rarity: z.string().optional().describe('The rarity of the card.'),
  confidence: z.number().optional().describe('Confidence score between 0 and 1.'),
  rawText: z.string().optional().describe('Any other relevant text identified on the card.'),
});
export type FindCardOutput = z.infer<typeof FindCardOutputSchema>;

const identifyCardPrompt = ai.definePrompt({
  name: 'identifyCardPrompt',
  input: { schema: FindCardInputSchema },
  output: { schema: FindCardOutputSchema },
  prompt: `You are an expert Pokemon TCG appraiser. Look at this image of a Pokemon card and identify the following details:
1. The Pokemon's name.
2. The expansion set name (look for symbols or copyright info at the bottom).
3. The card number (usually in the bottom corner, like 4/102, #6, or a promo code like SWSH001).
4. The rarity (Common, Uncommon, Rare, Holo Rare, etc.).

Provide your best estimate for each field. If you are unsure, provide your best guess based on visible cues.

Image:
{{media url=imageDataUri}}`,
});

const findCardFlow = ai.defineFlow(
  {
    name: 'findCardFlow',
    inputSchema: FindCardInputSchema,
    outputSchema: FindCardOutputSchema,
  },
  async (input: FindCardInput) => {
    try {
      console.log('Starting multimodal card identification...');
      const { output } = await identifyCardPrompt(input);

      if (!output) {
        throw new Error('AI failed to return structured data.');
      }

      console.log('AI Identification Result:', output);
      return {
        ...output,
        confidence: output.name ? 0.9 : 0.1, // Basic confidence metric
      };
    } catch (error) {
      console.error('Error in card identification flow:', error);
      return {
        confidence: 0,
      };
    }
  }
);

export async function findCardByImageEnhanced(input: FindCardInput): Promise<FindCardOutput> {
  return findCardFlow(input);
}

/**
 * Validates and cleans AI-generated card data.
 * Must be async because it is exported from a 'use server' file.
 */
export async function validateCardData(data: FindCardOutput): Promise<FindCardOutput> {
  const result = { ...data };

  // Clean up card numbers (e.g. remove "No. " prefix if AI adds it)
  if (result.cardNumber) {
    result.cardNumber = result.cardNumber.replace(/^No\.\s*/i, '').trim();
  }

  // Ensure rarity follows standard naming if detected
  const rarities = [
    'Common',
    'Uncommon',
    'Rare',
    'Holo Rare',
    'Ultra Rare',
    'Secret Rare',
    'Promo',
  ];
  if (result.rarity) {
    const matched = rarities.find((r) => r.toLowerCase() === result.rarity?.toLowerCase());
    if (matched) result.rarity = matched;
  }

  return result;
}

/**
 * Diagnostic tool to check multimodal visibility
 */
export async function testImageVisibility(imageDataUri: string): Promise<string> {
  const { text } = await ai.generate({
    prompt: [
      { media: { url: imageDataUri } },
      { text: 'Describe what you see in this image in one sentence.' },
    ],
  });
  return text;
}
