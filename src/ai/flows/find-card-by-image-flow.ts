// File: src/ai/flows/find-card-by-image-flow.ts
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FindCardInputSchema = z.object({
  imageDataUri: z.string(),
});
export type FindCardInput = z.infer<typeof FindCardInputSchema>;

const FindCardOutputSchema = z.object({
  name: z.string().optional(),
  set: z.string().optional(),
  cardNumber: z.string().optional(),
  rarity: z.string().optional(),
  rawText: z.string().optional(),
  language: z.string().optional(),
  type: z.string().optional(),
  supertype: z.string().optional(),
  setName: z.string().optional(),
  tcgplayerProductId: z.string().optional(),
});
export type FindCardOutput = z.infer<typeof FindCardOutputSchema>;

// Extract raw text from image - return as array to match your current format
const extractTextPrompt = ai.definePrompt({
  name: 'extractTextPrompt',
  input: {schema: FindCardInputSchema},
  output: {schema: z.object({text: z.array(z.string())})},
  prompt: `Extract ALL visible text from this Pokemon card image. Return each line of text as a separate array element. Read every word, number, and symbol you can see.

Image:
{{media url=imageDataUri}}`,
});

// Fixed parsing function that properly handles array input
function parseCardDetails(rawTextArray: string[]): FindCardOutput {
  console.log('Parsing raw text array:', rawTextArray);
  
  const result: FindCardOutput = {
    rawText: rawTextArray.join('\n')
  };

  // Convert array to string for searching
  const fullText = rawTextArray.join(' ');
  console.log('Joined text:', fullText);

  // Search through individual lines AND the full text
  result.name = findPokemonNameFromArray(rawTextArray, fullText);
  result.cardNumber = findCardNumberFromArray(rawTextArray, fullText);
  result.set = findSetNameFromArray(rawTextArray, fullText);
  result.rarity = findRarityFromArray(rawTextArray, fullText);
  
  console.log('Final parsed result:', result);
  return result;
}

function findPokemonNameFromArray(lines: string[], fullText: string): string | undefined {
  console.log('Looking for Pokemon name...');
  
  // Check each line for specific patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(`Checking line ${i}: "${line}"`);
    
    // Look for "Put [Pokemon] on the Stage" - this is in your line 9
    if (line.includes('Put') && line.includes('on the Stage')) {
      const match = line.match(/Put (\w+) on the Stage/i);
      if (match) {
        console.log('Found Pokemon from stage pattern:', match[1]);
        return match[1];
      }
    }
    
    // Look for "attached to [Pokemon]" 
    if (line.includes('attached to')) {
      const match = line.match(/attached to (\w+)/i);
      if (match) {
        console.log('Found Pokemon from attached pattern:', match[1]);
        return match[1];
      }
    }
    
    // Look for "power can't be used if [Pokemon]"
    if (line.includes("can't be used if")) {
      const match = line.match(/can't be used if (\w+)/i);
      if (match) {
        console.log('Found Pokemon from power pattern:', match[1]);
        return match[1];
      }
    }
  }
  
  // Direct search in full text for known Pokemon
  const pokemonList = ['Charizard', 'Blastoise', 'Venusaur', 'Pikachu', 'Mewtwo'];
  for (const pokemon of pokemonList) {
    if (fullText.toLowerCase().includes(pokemon.toLowerCase())) {
      console.log('Found Pokemon by direct search:', pokemon);
      return pokemon;
    }
  }
  
  console.log('No Pokemon name found');
  return undefined;
}

function findCardNumberFromArray(lines: string[], fullText: string): string | undefined {
  console.log('Looking for card number...');
  
  // Check each line for card number patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(`Checking line ${i} for card number: "${line}"`);
    
    // Look for "#6" pattern - this is in your line 51
    const hashMatch = line.match(/#(\d+)/);
    if (hashMatch) {
      console.log('Found card number with # pattern:', hashMatch[0]);
      return hashMatch[0];
    }
  }
  
  // Look for valid fraction patterns in full text, but be more selective
  const fractionMatches = fullText.match(/(\d{1,3})\/(\d{2,3})/g);
  if (fractionMatches) {
    console.log('Found fraction patterns:', fractionMatches);
    
    // Filter out obvious noise
    const validMatches = fractionMatches.filter(match => {
      const [num, total] = match.split('/').map(Number);
      // Base set has 102 cards, so 4/102 would be valid, but 704/4 is clearly wrong
      return num <= total && total >= 60 && total <= 500 && num >= 1;
    });
    
    if (validMatches.length > 0) {
      console.log('Found valid fraction card number:', validMatches[0]);
      return validMatches[0];
    }
  }
  
  console.log('No valid card number found');
  return undefined;
}

function findSetNameFromArray(lines: string[], fullText: string): string | undefined {
  console.log('Looking for set name...');
  
  // Check each line for copyright info
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for copyright line - this is in your line 52
    if (line.includes('©') && line.includes('Nintendo')) {
      console.log('Found copyright line:', line);
      
      // Check for Base Set copyright years
      if (line.includes('1995') || line.includes('1996') || line.includes('1998') || line.includes('1999')) {
        console.log('Identified as Base Set from copyright years');
        return 'Base Set';
      }
    }
  }
  
  console.log('No set identified');
  return undefined;
}

function findRarityFromArray(lines: string[], fullText: string): string | undefined {
  console.log('Looking for rarity...');
  
  // Check for rarity keywords
  if (fullText.toLowerCase().includes('rare holo')) return 'Rare Holo';
  if (fullText.toLowerCase().includes('rare')) return 'Rare';
  if (fullText.toLowerCase().includes('common')) return 'Common';
  if (fullText.toLowerCase().includes('uncommon')) return 'Uncommon';
  if (fullText.toLowerCase().includes('promo')) return 'Promo';
  
  // Infer rarity - Charizard from Base Set is Rare Holo
  if (fullText.toLowerCase().includes('charizard') && fullText.includes('1995')) {
    console.log('Inferred Charizard Base Set as Rare Holo');
    return 'Rare Holo';
  }
  
  return undefined;
}

const findCardFlow = ai.defineFlow(
  {
    name: 'findCardFlow',
    inputSchema: FindCardInputSchema,
    outputSchema: FindCardOutputSchema,
  },
  async (input: FindCardInput) => {
    try {
      console.log('Starting card analysis...');
      
      // Extract raw text using AI
      const textResult = await extractTextPrompt(input);
      const rawTextArray = textResult.output?.text || [];
      
      console.log('Raw extracted text array:', rawTextArray);
      
      // Parse the text array using our fixed parsing logic
      const result = parseCardDetails(rawTextArray);
      
      return result;
    } catch (error) {
      console.error('Error in card analysis:', error);
      return {
        rawText: undefined,
      };
    }
  }
);

export async function findCardByImageEnhanced(input: FindCardInput): Promise<FindCardOutput> {
  return findCardFlow(input);
}

export async function findCardByImageEnhancedEnhanced(input: FindCardInput): Promise<FindCardOutput> {
  try {
    console.log('Starting enhanced card analysis...');
    
    // Get our smart parsed result
    const smartResult = await findCardFlow(input);
    console.log('Smart parsing result:', smartResult);
    
    // If smart parsing found everything, return it
    if (smartResult.name && smartResult.cardNumber && smartResult.set) {
      return smartResult;
    }
    
    // Otherwise, try direct AI approach as backup
    const directPrompt = ai.definePrompt({
      name: 'directCardPrompt',
      input: {schema: FindCardInputSchema},
      output: {schema: z.object({
        pokemonName: z.string(),
        cardNumber: z.string(),
        setInfo: z.string(),
      })},
      prompt: `Look at this Pokemon card and tell me:

1. What Pokemon is this? (Look for the main character name)
2. What is the card number? (Look for numbers like "#6" or "4/102")
3. What set is this from? (Look for copyright info or set symbols)

Be very specific about what you can see.

Image:
{{media url=imageDataUri}}`,
    });
    
    const directFlow = ai.defineFlow({
      name: 'directCardFlow', 
      inputSchema: FindCardInputSchema,
      outputSchema: z.object({
        pokemonName: z.string(),
        cardNumber: z.string(), 
        setInfo: z.string(),
      }),
    }, async (input) => {
      const {output} = await directPrompt(input);
      return {
        pokemonName: output?.pokemonName || '',
        cardNumber: output?.cardNumber || '',
        setInfo: output?.setInfo || '',
      };
    });
    
    const directResult = await directFlow(input);
    console.log('Direct AI result:', directResult);
    
    // Combine the best of both approaches
    return {
      name: smartResult.name || directResult.pokemonName || undefined,
      cardNumber: smartResult.cardNumber || directResult.cardNumber || undefined,
      set: smartResult.set || (directResult.setInfo.includes('Base') ? 'Base Set' : undefined) || undefined,
      rarity: smartResult.rarity || undefined,
      rawText: smartResult.rawText,
    };
    
  } catch (error) {
    console.error('Enhanced analysis failed:', error);
    return findCardFlow(input);
  }
}