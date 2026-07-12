import { api, getChildId } from './api';

export interface CameraMission {
  title: string;
  instruction: string;
  targetColor: string;
  targetObject: string;
}

export interface MissionResult {
  success: boolean;
  matched: boolean;
  confidence: number;
  rewardXP: number;
  badge: string;
}

export interface CompletedMission {
  id: string;
  badgeName: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

/**
 * Gets a camera Scavenger Hunt mission in the specified language.
 */
export const getCameraMission = async (language: string): Promise<CameraMission> => {
  const childId = getChildId();
  const response = await api.post('/camera/mission', {
    childId,
    language,
  });
  return response.data.mission;
};

/**
 * Uploads/verifies photo targets and awards XP/badges on success.
 */
export const analyzePhoto = async (missionId: string, imageUrl: string): Promise<MissionResult> => {
  const childId = getChildId();
  const response = await api.post('/camera/analyze', {
    childId,
    missionId,
    imageUrl,
  });
  return response.data;
};

/**
 * Lists scavenger achievements unlocked by the current child.
 */
export const getCompletedMissions = async (): Promise<CompletedMission[]> => {
  const childId = getChildId();
  const response = await api.get(`/camera/history/${childId}`);
  return response.data.data;
};
