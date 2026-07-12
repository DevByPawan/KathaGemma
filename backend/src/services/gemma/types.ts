export interface StoryRequest {
  childName: string;
  age: number;
  prompt: string;
  language: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface StoryResponse {
  title: string;
  chapters: string[];
  choices?: Array<{ id: string; text: string }>;
  currentChapter: number;
  totalChapters: number;
  illustrationSuggestion: string;
}

export interface StoryContinuationRequest {
  storyId: string;
  chapterNumber: number;
  previousContent: string;
  selectedChoice: string;
  language: string;
}

export interface VocabularyExplanation {
  word: string;
  explanation: string;
  exampleSentence: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizResponse {
  storyTitle: string;
  questions: QuizQuestion[];
}

export interface CameraMission {
  missionId: string;
  targetObject: string;
  instructions: string;
  rewardXp: number;
}

export interface VoiceRequest {
  childId: string;
  transcript: string;
  language: string;
}

export interface VoiceResponse {
  replyText: string;
  suggestedPrompts: string[];
}

export interface GemmaResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
