import { Request, Response } from 'express';
import { cameraService } from '@/services/camera/camera.service';
import { z } from 'zod';

export const cameraMissionSchema = z.object({
  body: z.object({
    childId: z.string().uuid('Invalid child ID format'),
    language: z.string().min(1, 'Language parameter is required'),
  }),
});

export const analyzePhotoSchema = z.object({
  body: z.object({
    childId: z.string().uuid('Invalid child ID format'),
    missionId: z.string().min(1, 'Mission ID cannot be empty'),
    imageUrl: z.string().min(1, 'Image URL/Data cannot be empty'),
  }),
});

export const getCameraHistorySchema = z.object({
  params: z.object({
    childId: z.string().uuid('Invalid child ID format'),
  }),
});

export class CameraController {
  /**
   * Retrieves or creates a new exploration scavenger mission.
   */
  getMission = async (req: Request, res: Response): Promise<void> => {
    const { childId, language } = req.body;
    const mission = await cameraService.generateMission(childId, language);
    res.status(200).json({
      success: true,
      mission,
    });
  };

  /**
   * Analyzes an uploaded photograph and logs completions.
   */
  analyze = async (req: Request, res: Response): Promise<void> => {
    const { childId, missionId, imageUrl } = req.body;
    const result = await cameraService.analyzePhoto(childId, missionId, imageUrl);
    res.status(200).json(result);
  };

  /**
   * Lists completed missions of a child.
   */
  getHistory = async (req: Request, res: Response): Promise<void> => {
    const { childId } = req.params;
    const history = await cameraService.getCompletedMissions(childId);
    res.status(200).json({
      success: true,
      data: history,
    });
  };
}

export const cameraController = new CameraController();
