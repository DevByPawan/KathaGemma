import { Request, Response } from 'express';
import { storyService } from '@/services/story/story.service';
import { z } from 'zod';

export const startStorySchema = z.object({
  body: z.object({
    childId: z.string().uuid('Invalid child ID format'),
    language: z.string().min(1, 'Language is required'),
    prompt: z.string().min(1, 'Prompt is required'),
  }),
});

export const continueStorySchema = z.object({
  body: z.object({
    storyId: z.string().uuid('Invalid story ID format'),
    choice: z.string().min(1, 'Choice selection is required'),
  }),
});

export const getStorySchema = z.object({
  params: z.object({
    storyId: z.string().uuid('Invalid story ID format'),
  }),
});

export const getChildStoriesSchema = z.object({
  params: z.object({
    childId: z.string().uuid('Invalid child ID format'),
  }),
});

export const deleteStorySchema = z.object({
  params: z.object({
    storyId: z.string().uuid('Invalid story ID format'),
  }),
});

export const getChildProfileSchema = z.object({
  params: z.object({
    childId: z.string().uuid('Invalid child ID format'),
  }),
});

export const resetChildProgressSchema = z.object({
  params: z.object({
    childId: z.string().uuid('Invalid child ID format'),
  }),
});

export class StoryController {
  /**
   * Starts a new story.
   */
  start = async (req: Request, res: Response): Promise<void> => {
    const { childId, language, prompt } = req.body;
    const result = await storyService.startStory(childId, language, prompt);
    res.status(201).json({
      success: true,
      data: result,
    });
  };

  /**
   * Appends decision path choice and returns updated story.
   */
  continue = async (req: Request, res: Response): Promise<void> => {
    const { storyId, choice } = req.body;
    const result = await storyService.continueStory(storyId, choice);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  /**
   * Gets a story by ID.
   */
  get = async (req: Request, res: Response): Promise<void> => {
    const { storyId } = req.params;
    const result = await storyService.getStory(storyId);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  /**
   * Gets child stories.
   */
  getByChild = async (req: Request, res: Response): Promise<void> => {
    const { childId } = req.params;
    const result = await storyService.getStoriesByChild(childId);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  /**
   * Deletes a story.
   */
  delete = async (req: Request, res: Response): Promise<void> => {
    const { storyId } = req.params;
    await storyService.deleteStory(storyId);
    res.status(200).json({
      success: true,
      message: 'Story deleted successfully',
    });
  };

  /**
   * Gets child profile statistics and achievements.
   */
  getChildProfile = async (req: Request, res: Response): Promise<void> => {
    const { childId } = req.params;
    const result = await storyService.getChildProfile(childId);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  /**
   * Resets only the current child's progress (stories, achievements, and stats).
   */
  resetChildProgress = async (req: Request, res: Response): Promise<void> => {
    const { childId } = req.params;
    const result = await storyService.resetChildProgress(childId);
    res.status(200).json({
      success: true,
      data: result,
    });
  };
}

export const storyController = new StoryController();
