import { api, getChildId } from './api';

export interface VoiceChatResponse {
  success: boolean;
  reply: string;
  timestamp: string;
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
