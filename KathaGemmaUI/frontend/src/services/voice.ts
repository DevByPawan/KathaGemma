import { api, getChildId } from './api';

export interface VoiceChatResponse {
  success: boolean;
  reply: string;
  timestamp: string;
  uiAction?: string;
  expectedInput?: string;
}

/**
 * Sends a spoken voice query transcript to retrieve a companion reply.
 */
export const sendVoiceMessage = async (transcript: string, language: string, storyId?: string): Promise<VoiceChatResponse> => {
  const childId = getChildId();
  const response = await api.post('/voice/chat', {
    childId,
    transcript,
    language,
    storyId,
  });
  return response.data;
};

/**
 * Deletes the voice history for the current child session.
 */
export const deleteVoiceHistory = async (): Promise<void> => {
  const childId = getChildId();
  await api.delete(`/voice/history/${childId}`);
};

export interface VoiceHistoryLog {
  id: string;
  transcript: string;
  aiResponse: string;
  duration: number;
  createdAt: string;
}

/**
 * Fetches the voice history for the current child session.
 */
export const getVoiceHistory = async (): Promise<VoiceHistoryLog[]> => {
  const childId = getChildId();
  const response = await api.get(`/voice/history/${childId}`);
  return response.data.data;
};
