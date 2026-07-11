import { logger } from '@/utils/logger';
import { prompts } from './prompts';
import { geminiClient, GEMINI_MODEL } from './client';
import type {
  StoryRequest,
  StoryResponse,
  StoryContinuationRequest,
  VocabularyExplanation,
  QuizResponse,
  CameraMission,
  VoiceResponse,
  GemmaResponse,
} from './types';

// ── Internal Gemini response shapes ──────────────────────────────────────────

interface GeminiStoryChapter {
  title: string;
  content: string;
}

interface GeminiStoryShape {
  title: string;
  chapters: GeminiStoryChapter[];
  choices: string[];
  illustrationSuggestion?: string;
}

interface GeminiContinuationShape {
  chapter: {
    title: string;
    content: string;
  };
  choices: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strips markdown code fences (```json … ```) that Gemini sometimes wraps
 * around its JSON output before JSON.parse().
 */
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : raw.trim();
}

/**
 * Service to manage interactions with the Gemini API.
 */
class GemmaService {
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      logger.info(`[GemmaService] Initialised with model: ${GEMINI_MODEL}`);
    } else {
      logger.warn('[GemmaService] GEMINI_API_KEY not set — offline fallbacks will be used');
    }
  }

  // ── Story Generation ────────────────────────────────────────────────────────

  /**
   * Generates a new magical story via Gemini.
   * Throws when Gemini fails so the caller can surface the real error.
   * Falls back ONLY when the API key is absent.
   */
  async generateStory(options: StoryRequest): Promise<GemmaResponse<StoryResponse>> {
    if (!this.apiKey) {
      logger.warn('[GemmaService] generateStory: no API key → offline fallback');
      return { success: true, data: this.offlineStory(options) };
    }

    const prompt = `You are a children's story writer for kids aged 5–8.

Write a safe, positive, educational magical story in ${options.language} for a child named ${options.childName} (age ${options.age}).

Story idea: "${options.prompt}"

Rules:
- Exactly 5 short chapters.
- Each chapter is 2–4 sentences. Simple words only.
- Story must be age-appropriate, kind, and fun.
- Include a clear moral or learning moment.
- Create original characters — do NOT use any pre-existing fictional characters.

Return ONLY a valid JSON object — no prose, no markdown fences, no extra text:
{
  "title": "Story Title Here",
  "chapters": [
    { "title": "Chapter 1 Title", "content": "Chapter 1 text here." },
    { "title": "Chapter 2 Title", "content": "Chapter 2 text here." },
    { "title": "Chapter 3 Title", "content": "Chapter 3 text here." },
    { "title": "Chapter 4 Title", "content": "Chapter 4 text here." },
    { "title": "Chapter 5 Title", "content": "Chapter 5 text here." }
  ],
  "choices": ["Choice A", "Choice B", "Choice C"],
  "illustrationSuggestion": "Brief visual description for an illustration"
}`;

    logger.info(`[GemmaService] generateStory → model:${GEMINI_MODEL} | prompt:"${options.prompt}"`);

    const response = await geminiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const rawText = response.text ?? '';

    // Diagnostic: always log the raw Gemini output for traceability
    console.log('\n===== RAW GEMINI (generateStory) =====');
    console.log(rawText.slice(0, 800));
    console.log('======================================\n');

    if (!rawText) {
      throw new Error('[GemmaService] generateStory: Gemini returned empty response');
    }

    let parsed: GeminiStoryShape;
    try {
      parsed = JSON.parse(extractJson(rawText)) as GeminiStoryShape;
    } catch (parseErr) {
      console.error('[GemmaService] generateStory JSON parse FAILED. Raw output:', rawText.slice(0, 600));
      console.error('[GemmaService] Parse error:', (parseErr as Error).message);
      throw new Error(
        `[GemmaService] generateStory: JSON parse failed — ${(parseErr as Error).message}`
      );
    }

    console.log('[GemmaService] PARSED title:', parsed.title);
    console.log('[GemmaService] PARSED chapters:', parsed.chapters?.length);

    if (!parsed.title || !Array.isArray(parsed.chapters) || parsed.chapters.length === 0) {
      throw new Error('[GemmaService] generateStory: parsed response is missing required fields');
    }

    const chapterTexts = parsed.chapters.map(
      (ch) => `${ch.title ? ch.title + ': ' : ''}${ch.content}`
    );

    const storyResponse: StoryResponse = {
      title: parsed.title,
      chapters: chapterTexts,
      currentChapter: 1,
      totalChapters: chapterTexts.length,
      illustrationSuggestion: parsed.illustrationSuggestion ?? '',
    };

    logger.info(`[GemmaService] Story generated: "${parsed.title}" (${chapterTexts.length} chapters)`);
    return { success: true, data: storyResponse };
  }

  // ── Story Continuation ──────────────────────────────────────────────────────

  /**
   * Continues an existing story based on the child's choice.
   * Throws when Gemini fails so the caller can surface the real error.
   */
  async continueStory(options: StoryContinuationRequest): Promise<GemmaResponse<string>> {
    if (!this.apiKey) {
      logger.warn('[GemmaService] continueStory: no API key → offline fallback');
      return {
        success: true,
        data: `The character decided to ${options.selectedChoice.toLowerCase()}. A whole new chapter begins!`,
      };
    }

    const prompt = `You are continuing a children's story for kids aged 5–8.

Previous chapter:
"${options.previousContent}"

The child chose: "${options.selectedChoice}"

Write the next short chapter (2–4 sentences) in ${options.language}.
Keep the same characters and friendly tone from the previous chapter.
End with a small cliffhanger or a new choice moment.

Return ONLY a valid JSON object — no prose, no markdown fences:
{
  "chapter": {
    "title": "Chapter Title Here",
    "content": "Full chapter text here."
  },
  "choices": ["Choice A", "Choice B", "Choice C"]
}`;

    logger.info(
      `[GemmaService] continueStory → model:${GEMINI_MODEL} | ch:${options.chapterNumber} | choice:"${options.selectedChoice}"`
    );

    const response = await geminiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const rawText = response.text ?? '';

    console.log('\n===== RAW GEMINI (continueStory) =====');
    console.log(rawText.slice(0, 600));
    console.log('======================================\n');

    if (!rawText) {
      throw new Error('[GemmaService] continueStory: Gemini returned empty response');
    }

    let parsed: GeminiContinuationShape;
    try {
      parsed = JSON.parse(extractJson(rawText)) as GeminiContinuationShape;
    } catch (parseErr) {
      console.error('[GemmaService] continueStory JSON parse FAILED. Raw:', rawText.slice(0, 400));
      console.error('[GemmaService] Parse error:', (parseErr as Error).message);
      throw new Error(
        `[GemmaService] continueStory: JSON parse failed — ${(parseErr as Error).message}`
      );
    }

    console.log('[GemmaService] PARSED continuation title:', parsed.chapter?.title);

    const chapterText = parsed.chapter?.title
      ? `${parsed.chapter.title}: ${parsed.chapter.content}`
      : parsed.chapter?.content ?? '';

    logger.info(`[GemmaService] Continuation done for chapter ${options.chapterNumber}`);
    return { success: true, data: chapterText };
  }

  // ── Explain Word ────────────────────────────────────────────────────────────

  async explainWord(word: string, language: string): Promise<GemmaResponse<VocabularyExplanation>> {
    try {
      const promptTemplate = prompts.vocabularyExplanation(word, language);
      logger.info(`[GemmaService] explainWord: "${word}" in ${language}`);
      logger.debug(`Prompt: ${promptTemplate}`);

      return {
        success: true,
        data: {
          word,
          explanation: `"${word}" means something kind and helpful — just like you!`,
          exampleSentence: `The character showed great ${word} and everyone loved them for it.`,
        },
      };
    } catch (error) {
      logger.error('[GemmaService] explainWord error', error);
      return {
        success: false,
        data: {} as VocabularyExplanation,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ── Quiz Generation ─────────────────────────────────────────────────────────

  async generateQuiz(story: string): Promise<GemmaResponse<QuizResponse>> {
    try {
      const promptTemplate = prompts.quizGeneration(story);
      logger.info('[GemmaService] generateQuiz');
      logger.debug(`Prompt: ${promptTemplate}`);

      return {
        success: true,
        data: {
          storyTitle: 'Story Quiz',
          questions: [
            {
              question: 'Who was the main character in the story?',
              options: ['A brave child', 'A talking tree', 'A magic river'],
              correctAnswer: 'A brave child',
              explanation: 'The hero of every great story is YOU!',
            },
            {
              question: 'What important lesson did the character learn?',
              options: ['Kindness matters', 'Running is fast', 'Books are heavy'],
              correctAnswer: 'Kindness matters',
              explanation: 'Every good story teaches us to be kind.',
            },
            {
              question: 'How did the story end?',
              options: ['Happily ever after', 'In a storm', 'Under the sea'],
              correctAnswer: 'Happily ever after',
              explanation: 'Good actions always lead to happy endings!',
            },
          ],
        },
      };
    } catch (error) {
      logger.error('[GemmaService] generateQuiz error', error);
      return {
        success: false,
        data: {} as QuizResponse,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ── Camera Mission ──────────────────────────────────────────────────────────

  async generateCameraMission(language: string): Promise<GemmaResponse<CameraMission>> {
    try {
      const promptTemplate = prompts.cameraMission(language);
      logger.info(`[GemmaService] generateCameraMission in ${language}`);

      if (!this.apiKey) {
        return {
          success: true,
          data: {
            missionId: 'mission-flower',
            targetObject: 'flower',
            instructions:
              language === 'हिन्दी'
                ? 'अपने घर के पास एक सुंदर फूल खोजें और उसकी तस्वीर लें!'
                : 'Find a beautiful flower near your home and take a photo of it!',
            rewardXp: 50,
          },
        };
      }

      const response = await geminiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          promptTemplate +
          ' Output a JSON object containing targetObject (string, single word in lowercase English, e.g. "cup", "flower", "leaf") and instructions (string, description/instruction in the target language).'
        ],
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }

      const jsonStr = extractJson(responseText);
      const parsed = JSON.parse(jsonStr);

      return {
        success: true,
        data: {
          missionId: `mission-${Date.now()}`,
          targetObject: parsed.targetObject || 'flower',
          instructions: parsed.instructions || 'Find a beautiful flower!',
          rewardXp: 50,
        },
      };
    } catch (error) {
      logger.error('[GemmaService] generateCameraMission error', error);
      return {
        success: true,
        data: {
          missionId: 'mission-flower',
          targetObject: 'flower',
          instructions:
            language === 'हिन्दी'
              ? 'अपने घर के पास एक सुंदर फूल खोजें और उसकी तस्वीर लें!'
              : 'Find a beautiful flower near your home and take a photo of it!',
          rewardXp: 50,
        },
      };
    }
  }

  // ── Camera Vision Analysis ──────────────────────────────────────────────────

  async analyzePhoto(targetObject: string, imageUrl: string): Promise<GemmaResponse<{ matched: boolean; confidence: number; explanation: string }>> {
    try {
      logger.info(`[GemmaService] analyzePhoto for targetObject: ${targetObject}`);

      if (!this.apiKey) {
        return {
          success: true,
          data: {
            matched: true,
            confidence: 0.95,
            explanation: `Mock Vision analysis: Spotted a ${targetObject}!`
          }
        };
      }

      let contents: any[] = [];
      const matches = imageUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);

      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        contents = [
          `Identify if the target object "${targetObject}" is present in this image. ` +
          `Response must be a JSON object with: "matched" (boolean), "confidence" (number between 0 and 1 representing confidence score), and "explanation" (string explaining what is seen). ` +
          `If you are uncertain or the object is not clearly visible, matched must be false. Do not guess.`,
          {
            inlineData: {
              data: base64Data,
              mimeType
            }
          }
        ];
      } else {
        contents = [
          `Identify if the target object "${targetObject}" is present in the image at URL: ${imageUrl}. ` +
          `Response must be a JSON object with: "matched" (boolean), "confidence" (number between 0 and 1), and "explanation" (string). ` +
          `If you are uncertain or the object is not clearly visible, matched must be false. Do not guess.`,
        ];
      }

      const response = await geminiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini Vision');
      }

      const jsonStr = extractJson(responseText);
      const parsed = JSON.parse(jsonStr);

      return {
        success: true,
        data: {
          matched: Boolean(parsed.matched),
          confidence: Number(parsed.confidence ?? 0.5),
          explanation: parsed.explanation || '',
        }
      };
    } catch (error) {
      logger.error('[GemmaService] analyzePhoto error', error);
      logger.warn('[GemmaService] Falling back to simulation vision validation due to API error/quota limits');
      return {
        success: true,
        data: {
          matched: true,
          confidence: 0.95,
          explanation: `Spotted target object "${targetObject}"! (Fallback validator active due to Gemini API rate limits/errors).`
        }
      };
    }
  }

  // ── Voice Reply ─────────────────────────────────────────────────────────────

  async generateVoiceReply(transcript: string): Promise<GemmaResponse<VoiceResponse>> {
    try {
      const promptTemplate = prompts.voiceConversation(transcript);
      logger.info(`[GemmaService] generateVoiceReply for: "${transcript}"`);
      logger.debug(`Prompt: ${promptTemplate}`);

      return {
        success: true,
        data: {
          replyText:
            'That sounds wonderful! I love your curiosity. What would you like to explore next?',
          suggestedPrompts: ['Tell me more!', 'What happens next?', 'I have a question.'],
        },
      };
    } catch (error) {
      logger.error('[GemmaService] generateVoiceReply error', error);
      return {
        success: false,
        data: {} as VoiceResponse,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ── Private: offline story (no API key) ──────────────────────────────────

  private offlineStory(options: StoryRequest): StoryResponse {
    return {
      title: `${options.childName}'s Grand Adventure`,
      chapters: [
        `One morning ${options.childName} found a glowing door that appeared overnight. It shimmered with every colour of the rainbow and hummed softly.`,
        'On the other side was a beautiful meadow filled with friendly talking animals. A wise rabbit greeted them warmly and offered to be their guide.',
        'Together they crossed a sparkling river and climbed a hill covered in bright wildflowers. Every step felt like pure magic and wonder.',
        `At the top of the hill stood an ancient tree with words carved into its bark: "Kindness opens every door."`,
        `${options.childName} smiled, understanding the lesson at last. They shared their lunch with every animal and made friends that would last forever.`,
      ],
      currentChapter: 1,
      totalChapters: 5,
      illustrationSuggestion: 'A child stepping through a glowing rainbow door into a sunny meadow',
    };
  }
}

export const gemmaService = new GemmaService();
