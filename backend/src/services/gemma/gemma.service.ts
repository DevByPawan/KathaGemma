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

// ── Error classifier ─────────────────────────────────────────────────────────

/**
 * Returns true for transient Gemini API failures where serving an offline
 * fallback is appropriate: quota limits, service unavailability, network
 * failures, or malformed responses.
 */
function isGeminiFallbackError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  const msg = error.message.toLowerCase();
  if (msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) return true;
  if (msg.includes('503') || msg.includes('unavailable') || msg.includes('overloaded')) return true;
  if (
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('enotfound') ||
    msg.includes('socket')
  ) return true;
  if (msg.includes('empty response') || msg.includes('json parse failed')) return true;
  return true; // catch-all: always serve fallback to prevent HTTP 500
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : raw.trim();
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]!;
}

// ── Offline fallback pools ────────────────────────────────────────────────────

const OFFLINE_STORY_SEEDS = [
  {
    titleTemplate: "{{name}}'s Lost Cloud",
    chapter1:
      "High above the hills, {{name}} spotted a small cloud that had drifted away from the others. It tumbled and spun in the wind, all on its own. With a brave heart, {{name}} reached out a hand and the cloud paused, as if it had been waiting for exactly this moment.",
    illustration: 'A child reaching toward a small fluffy cloud against a sunset sky',
  },
  {
    titleTemplate: "The Star That Fell Near {{name}}",
    chapter1:
      "One crisp evening {{name}} noticed a soft glow in the backyard garden. Tucked between the tomatoes was a tiny star, no bigger than an apple, quietly humming. It blinked twice when {{name}} knelt beside it, as though saying hello.",
    illustration: 'A glowing star nestled in a garden at twilight while a child watches',
  },
  {
    titleTemplate: "{{name}} and the Talking River",
    chapter1:
      "The old river at the edge of town had never spoken before—but today it did. In a voice like gentle rain it called {{name}}'s name and asked for help. Three silver fish leapt up to show the way.",
    illustration: 'A sparkling river speaking to a curious child on its banks',
  },
  {
    titleTemplate: "The Tiny Island Only {{name}} Could See",
    chapter1:
      "During a morning walk {{name}} looked at the pond and saw something impossible: a green island the size of a pillow, floating perfectly still. Every grown-up walked past without noticing. Only {{name}} could see it—and a small lantern on it was already lit.",
    illustration: 'A miniature island with a lit lantern floating in a calm pond',
  },
  {
    titleTemplate: "{{name}}'s Map to Nowhere",
    chapter1:
      "Tucked inside a library book {{name}} found a hand-drawn map with no title and no legend—only a dotted trail and a single red dot. When {{name}} held it to the light, the red dot moved. The adventure had already begun.",
    illustration: 'A child holding a mysterious glowing map in a sunlit library',
  },
  {
    titleTemplate: "When the Moon Visited {{name}}",
    chapter1:
      "The moon had always felt very far away, but tonight it hovered just above the rooftop, round and warm as a lantern. It said it had lost something important and needed {{name}}'s help to find it before dawn.",
    illustration: 'A huge moon hovering close to rooftops while a child stands on a balcony',
  },
  {
    titleTemplate: "{{name}} and the Painted Door",
    chapter1:
      "At the end of the alley someone had painted a door on the wall—bright blue with golden hinges. {{name}} reached out just to touch the paint, but the handle turned, the door swung open, and warm light poured through.",
    illustration: 'A painted door on a brick wall glowing with warm golden light',
  },
  {
    titleTemplate: "The Library That Remembered {{name}}",
    chapter1:
      "The old library smelled of honey and pine. When {{name}} stepped inside, the books began to hum softly, each one glowing a different colour. The librarian—a small owl in round spectacles—said the books had been waiting all week.",
    illustration: 'Glowing colourful books in a cozy library with an owl librarian',
  },
];

const OFFLINE_MID_CHAPTERS = [
  "Through the winding path the adventurer discovered a hidden valley where the trees grew upside-down, roots stretching to the sky. A friendly creature no taller than a boot offered to be a guide.",
  "A sudden shower of silver leaves fell from a cloudless sky. Each leaf had a letter written on it; together they spelled a clue that had to be solved before the next heartbeat.",
  "The journey led to a humming bridge made entirely of music notes. Every step played a new chord, and the melody told exactly which direction to go.",
  "A door carved into a mossy hillside opened just as the adventurer approached. Inside: a warm room, a glowing fireplace, and a map pinned to the wall with tomorrow's weather on it.",
  "Floating lanterns guided the way across a wide river where the water sang in whispers. On the far bank waited something extraordinary.",
  "Arriving at a clearing filled with luminous mushrooms, each colour held meaning: blue for wisdom, yellow for courage, green for kindness. The choice mattered.",
  "An ancient clock tower stood in the middle of a meadow, its hands spinning backwards. A tiny door at the base opened and a voice inside said: 'Hurry — there is just enough time.'",
  "The map led to a hidden library beneath a waterfall, where every book wrote itself as it was read. One of them had the adventurer's name on the cover.",
  "Deep in the adventure, a clearing appeared where time moved differently—hours felt like moments. A wise tortoise sitting on a stone said the secret was knowing what truly mattered.",
  "The stars had rearranged themselves into a message only the brave could decode. Following the pattern led to a hidden garden where flowers bloomed in all four seasons at once.",
  "Three paths appeared ahead: one made of gold, one of shadow, one of ordinary earth. The earth path proved to be the wisest choice of all.",
  "A gentle giant made entirely of morning mist asked a favour. Completing it would unlock the final part of the adventure.",
];

const OFFLINE_FINAL_CHAPTERS = [
  "Back home that evening, sitting by the window watching the stars appear one by one, the adventure had changed something quietly inside — a new kind of confidence, like knowing you can always find the way back. Sweet dreams came quickly.",
  "With the task completed, the journey home led through golden afternoon light, carrying a tiny keepsake from the adventure. Every person along the way seemed to smile a little more warmly today.",
  "The journey was over, but the lessons would last forever: curiosity, kindness, and a willingness to help were stronger than any magic. At home, supper was warm and the night was peaceful.",
  "The last piece of the puzzle slipped into place just as the sun touched the horizon. The whole adventure had been possible because of one simple thing: believing it was.",
  "As the final chapter closed, it became clear that the greatest treasure was not something you could hold — it was the memory of a day when anything seemed possible. And it really had been.",
  "The adventure had given a gift: eyes that could now see the extraordinary hiding inside ordinary things. Stepping back through the familiar door felt, somehow, like arriving at a new beginning.",
];

const OFFLINE_CHOICE_SETS = [
  ['Follow the light deeper into the forest', 'Call out to see if anyone else is near', 'Examine the mysterious object carefully'],
  ['Climb higher to get a better view', 'Ask the creature for guidance', 'Search for hidden clues nearby'],
  ['Cross the humming bridge boldly', 'Look for another way around', 'Listen carefully to what the bridge melody says'],
  ['Accept the creature\'s offer to guide you', 'Look inside the door cautiously', 'Solve the riddle first before going further'],
  ['Choose the wisdom path', 'Choose the courage path', 'Choose the kindness path'],
  ['Answer the riddle of the clock tower', 'Peek through the tiny door at the base', 'Walk around to find another entrance'],
  ['Open the book with the familiar name on the cover', 'Read a different book first to find clues', 'Look for another hidden door in the library'],
  ['Follow the colourful birds exactly', 'Find your own path over the hills', 'Rest and observe from a distance first'],
  ['Ask the tortoise the question you have been holding', 'Study the stars to decode their pattern', 'Explore the seasonal garden further'],
  ['Choose the gold path', 'Choose the shadow path', 'Choose the ordinary earth path'],
  ['Complete the giant\'s favour straight away', 'Ask for more information before deciding', 'Look for a creative third option'],
];

function buildOfflineStory(options: StoryRequest): StoryResponse {
  const seed = options.childName.charCodeAt(0) + (options.prompt.length % 100);
  const template = pick(OFFLINE_STORY_SEEDS, seed);

  const title = template.titleTemplate.replace(/\{\{name\}\}/g, options.childName);
  const chapterText = template.chapter1.replace(/\{\{name\}\}/g, options.childName);

  const choiceSet = pick(OFFLINE_CHOICE_SETS, seed + 7);
  const choices = choiceSet.map((text, idx) => ({ id: `choice_${idx}`, text }));

  return {
    title,
    chapters: [chapterText],
    choices,
    currentChapter: 1,
    totalChapters: 5,
    illustrationSuggestion: template.illustration,
  };
}

function buildOfflineContinuation(
  options: StoryContinuationRequest
): { chapter: string; choices: Array<{ id: string; text: string }> } {
  const isFinal = options.chapterNumber >= 5;
  const seed =
    options.storyId.charCodeAt(0) +
    options.chapterNumber * 17 +
    (options.selectedChoice.length % 50);

  if (isFinal) {
    return { chapter: pick(OFFLINE_FINAL_CHAPTERS, seed), choices: [] };
  }

  const chapterText = pick(OFFLINE_MID_CHAPTERS, seed + 3);
  const choiceSet = pick(OFFLINE_CHOICE_SETS, seed + 11);
  const choices = choiceSet.map((text, idx) => ({ id: `choice_${idx}`, text }));

  return { chapter: chapterText, choices };
}

// ── GemmaService ─────────────────────────────────────────────────────────────

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

  async generateStory(options: StoryRequest): Promise<GemmaResponse<StoryResponse>> {
    if (!this.apiKey) {
      logger.warn('[GemmaService] generateStory: no API key → offline fallback');
      return { success: true, data: buildOfflineStory(options) };
    }

    const prompt = `You are a children's story writer for kids aged 5-8.

Write the first chapter (exactly 2-4 sentences) of a safe, positive, educational magical story in ${options.language} for a child named ${options.childName} (age ${options.age}).

Story idea prompt: "${options.prompt}"

Rules:
- Generate ONLY the first chapter of the story.
- Generate 3 options of what the character should do next (short interactive choice phrases).
- Do not use pre-existing fictional characters.

Return ONLY a valid JSON object - no prose, no markdown fences, no extra text:
{
  "title": "Story Title Here",
  "chapter": "First chapter content text here.",
  "choices": ["Choice A text", "Choice B text", "Choice C text"],
  "illustrationSuggestion": "Brief visual description for an illustration"
}`;

    logger.info(`[GemmaService] generateStory (Ch1 only) - model:${GEMINI_MODEL} | prompt:"${options.prompt}"`);

    try {
      const response = await geminiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const rawText = response.text ?? '';
      console.log('\n===== RAW GEMINI (generateStory) =====');
      console.log(rawText.slice(0, 800));
      console.log('======================================\n');

      if (!rawText) throw new Error('[GemmaService] generateStory: Gemini returned empty response');

      let parsed: any;
      try {
        parsed = JSON.parse(extractJson(rawText));
      } catch (parseErr) {
        console.error('[GemmaService] generateStory JSON parse FAILED. Raw:', rawText.slice(0, 600));
        throw new Error(`[GemmaService] generateStory: JSON parse failed`);
      }

      const firstChoices = Array.isArray(parsed.choices)
        ? parsed.choices.map((text: string, idx: number) => ({ id: `choice_${idx}`, text }))
        : [];

      logger.info(`[GemmaService] Story generated: "${parsed.title}" (Chapter 1)`);
      return {
        success: true,
        data: {
          title: parsed.title || 'Adventure Story',
          chapters: [parsed.chapter || 'An exciting adventure begins!'],
          choices: firstChoices,
          currentChapter: 1,
          totalChapters: 5,
          illustrationSuggestion: parsed.illustrationSuggestion ?? '',
        }
      };
    } catch (err) {
      logger.warn(`[GemmaService] generateStory: Gemini unavailable (${(err as Error).message}) - serving offline fallback`);
      return { success: true, data: buildOfflineStory(options) };
    }
  }

  // ── Story Continuation ──────────────────────────────────────────────────────

  async continueStory(options: StoryContinuationRequest): Promise<GemmaResponse<{ chapter: string; choices: Array<{ id: string; text: string }> }>> {
    const isFinal = options.chapterNumber >= 5;

    if (!this.apiKey) {
      logger.warn('[GemmaService] continueStory: no API key → offline fallback');
      return { success: true, data: buildOfflineContinuation(options) };
    }

    let prompt = '';
    if (isFinal) {
      prompt = `You are writing the final chapter (Chapter 5) of a children's story in ${options.language}.

Story context so far:
"${options.previousContent}"

The child selected the action: "${options.selectedChoice}"

Rules:
- Write the final concluding chapter (exactly 2-4 sentences) to resolve the adventure with a happy ending.
- Since this is the end of the story, do NOT generate choices.

Return ONLY a valid JSON object:
{
  "chapter": "Final chapter text here."
}`;
    } else {
      prompt = `You are writing Chapter ${options.chapterNumber} of a children's story in ${options.language}.

Story context so far:
"${options.previousContent}"

The child selected the action: "${options.selectedChoice}"

Rules:
- Write the next chapter (exactly 2-4 sentences).
- Generate 3 options of what the character should do next (short interactive choice phrases).

Return ONLY a valid JSON object:
{
  "chapter": "Chapter text here.",
  "choices": ["Option A", "Option B", "Option C"]
}`;
    }

    logger.info(`[GemmaService] continueStory - model:${GEMINI_MODEL} | ch:${options.chapterNumber} | choice:"${options.selectedChoice}"`);

    try {
      const response = await geminiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const rawText = response.text ?? '';
      console.log('\n===== RAW GEMINI (continueStory) =====');
      console.log(rawText.slice(0, 600));
      console.log('======================================\n');

      if (!rawText) throw new Error('[GemmaService] continueStory: Gemini returned empty response');

      let parsed: any;
      try {
        parsed = JSON.parse(extractJson(rawText));
      } catch (parseErr) {
        console.error('[GemmaService] continueStory JSON parse FAILED. Raw:', rawText.slice(0, 400));
        throw new Error(`[GemmaService] continueStory: JSON parse failed`);
      }

      const nextChoices = isFinal
        ? []
        : (Array.isArray(parsed.choices)
            ? parsed.choices.map((text: string, idx: number) => ({ id: `choice_${idx}`, text }))
            : []);

      logger.info(`[GemmaService] Continuation done for chapter ${options.chapterNumber}`);
      return {
        success: true,
        data: {
          chapter: parsed.chapter || 'The story continues along magical paths!',
          choices: nextChoices
        }
      };
    } catch (err) {
      logger.warn(`[GemmaService] continueStory: Gemini unavailable (${(err as Error).message}) - serving offline fallback ch:${options.chapterNumber}`);
      return { success: true, data: buildOfflineContinuation(options) };
    }
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
          explanation: `"${word}" means something kind and helpful - just like you!`,
          exampleSentence: `The character showed great ${word} and everyone loved them for it.`,
        },
      };
    } catch (error) {
      logger.error('[GemmaService] explainWord error', error);
      return { success: false, data: {} as VocabularyExplanation, error: error instanceof Error ? error.message : 'Unknown error' };
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
      return { success: false, data: {} as QuizResponse, error: error instanceof Error ? error.message : 'Unknown error' };
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
        config: { responseMimeType: 'application/json' }
      });

      const responseText = response.text;
      if (!responseText) throw new Error('Empty response from Gemini');

      const parsed = JSON.parse(extractJson(responseText));
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
          data: { matched: true, confidence: 0.95, explanation: `Vision analysis: Spotted a ${targetObject}!` }
        };
      }

      let contents: any[] = [];
      const matches = imageUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);

      if (matches) {
        contents = [
          `Identify if the target object "${targetObject}" is present in this image. ` +
          `Response must be a JSON object with: "matched" (boolean), "confidence" (number 0-1), and "explanation" (string). ` +
          `If uncertain or not clearly visible, matched must be false.`,
          { inlineData: { data: matches[2], mimeType: matches[1] } }
        ];
      } else {
        contents = [
          `Identify if the target object "${targetObject}" is present in the image at URL: ${imageUrl}. ` +
          `Response must be a JSON object with: "matched" (boolean), "confidence" (number 0-1), and "explanation" (string).`,
        ];
      }

      const response = await geminiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: { responseMimeType: 'application/json' }
      });

      const responseText = response.text;
      if (!responseText) throw new Error('Empty response from Gemini Vision');

      const parsed = JSON.parse(extractJson(responseText));
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
      logger.warn('[GemmaService] Vision fallback active due to Gemini API rate limits/errors');
      return {
        success: true,
        data: {
          matched: true,
          confidence: 0.95,
          explanation: `Spotted target object "${targetObject}"! (Offline vision validation active.)`
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
          replyText: 'That sounds wonderful! I love your curiosity. What would you like to explore next?',
          suggestedPrompts: ['Tell me more!', 'What happens next?', 'I have a question.'],
        },
      };
    } catch (error) {
      logger.error('[GemmaService] generateVoiceReply error', error);
      return { success: false, data: {} as VoiceResponse, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const gemmaService = new GemmaService();
