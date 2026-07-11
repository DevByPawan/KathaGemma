import { api, getChildId } from './api';

export interface StoryStartResponse {
  storyId: string;
  title: string;
  story: string[];
  createdAt: string;
}

export interface StoryDetailsResponse {
  id: string;
  title: string;
  prompt: string;
  language: string;
  generatedStory: string[];
  difficulty: string;
  status: string;
  createdAt: string;
}

/**
 * Starts a new storytelling session.
 */
export const startNewStory = async (prompt: string, language: string): Promise<StoryStartResponse> => {
  const childId = getChildId();
  const response = await api.post('/story/start', {
    childId,
    language,
    prompt,
  });
  return response.data.data;
};

/**
 * Appends a child choice decision to progress the story.
 */
export const continueStory = async (storyId: string, choice: string): Promise<StoryDetailsResponse> => {
  const response = await api.post('/story/continue', {
    storyId,
    choice,
  });
  return response.data.data;
};

/**
 * Loads a story's contents and options.
 */
export const getStoryDetails = async (storyId: string): Promise<StoryDetailsResponse> => {
  const response = await api.get(`/story/${storyId}`);
  return response.data.data;
};

/**
 * Lists stories created by the current child session.
 */
export const getChildStories = async (): Promise<StoryDetailsResponse[]> => {
  const childId = getChildId();
  const response = await api.get(`/story/child/${childId}`);
  return response.data.data;
};

/**
 * Deletes a story log.
 */
export const deleteStory = async (storyId: string): Promise<void> => {
  await api.delete(`/story/${storyId}`);
};

export interface ChildProfileResponse {
  name: string;
  age: number;
  avatar: string;
  xp: number;
  streak: number;
  currentLevel: number;
  achievements: any[];
  storiesCount: number;
}

/**
 * Gets child profile details and achievements.
 */
export const getChildProfile = async (): Promise<ChildProfileResponse> => {
  const childId = getChildId();
  const response = await api.get(`/story/child/${childId}/profile`);
  return response.data.data;
};

/**
 * Resets the child's dynamic achievements, stories, and experience.
 */
export const resetChildProgress = async (): Promise<ChildProfileResponse> => {
  const childId = getChildId();
  const response = await api.post(`/story/child/${childId}/reset`);
  return response.data.data;
};
