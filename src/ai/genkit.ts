import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Load environment variables from .env file
// dotenv.config(); // Removed, Next.js handles this automatically

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY })],
  model: 'googleai/gemini-2.0-flash',
});
