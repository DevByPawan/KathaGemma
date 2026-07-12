import { Router } from 'express';
import {
  storyController,
  startStorySchema,
  continueStorySchema,
  getStorySchema,
  getChildStoriesSchema,
  deleteStorySchema,
  getChildProfileSchema,
  resetChildProgressSchema,
} from '@/controllers/story.controller';
import { validate } from '@/middlewares/validate';
import { asyncHandler } from '@/middlewares/error';

const router = Router();

router.post(
  '/start',
  validate(startStorySchema),
  asyncHandler(storyController.start)
);

router.post(
  '/continue',
  validate(continueStorySchema),
  asyncHandler(storyController.continue)
);

router.get(
  '/:storyId',
  validate(getStorySchema),
  asyncHandler(storyController.get)
);

router.get(
  '/child/:childId',
  validate(getChildStoriesSchema),
  asyncHandler(storyController.getByChild)
);

router.get(
  '/child/:childId/profile',
  validate(getChildProfileSchema),
  asyncHandler(storyController.getChildProfile)
);

router.post(
  '/child/:childId/reset',
  validate(resetChildProgressSchema),
  asyncHandler(storyController.resetChildProgress)
);

router.delete(
  '/:storyId',
  validate(deleteStorySchema),
  asyncHandler(storyController.delete)
);

export default router;
