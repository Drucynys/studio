
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY })
  ],
  model: 'googleai/gemini-2.0-flash',
});
