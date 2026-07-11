import { GoogleGenAI } from '@google/genai';
import { logger } from '@/utils/logger';

// ---------------------------------------------------------------------------
// Gemini Client — Singleton
//
// Reads GEMINI_API_KEY from the environment (set in backend/.env).
// The key is NEVER forwarded to the frontend.
// ---------------------------------------------------------------------------

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  logger.warn(
    '[GeminiClient] GEMINI_API_KEY is not set. ' +
    'AI features will fall back to mock responses until the key is configured.'
  );
}

/**
 * Singleton Google GenAI client.
 *
 * All services that need Gemini access should import this instance
 * rather than creating their own to avoid redundant initialisation.
 *
 * Usage:
 *   import { geminiClient } from '@/services/gemma/client';
 *   const model = geminiClient.models;
 */
export const geminiClient = new GoogleGenAI({ apiKey: apiKey ?? '' });
export const GEMINI_MODEL = 'gemini-flash-latest';
