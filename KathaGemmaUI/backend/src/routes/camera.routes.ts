import { Router } from 'express';
import {
  cameraController,
  cameraMissionSchema,
  analyzePhotoSchema,
  getCameraHistorySchema,
} from '@/controllers/camera.controller';
import { validate } from '@/middlewares/validate';
import { asyncHandler } from '@/middlewares/error';

const router = Router();

router.post(
  '/mission',
  validate(cameraMissionSchema),
  asyncHandler(cameraController.getMission)
);

router.post(
  '/analyze',
  validate(analyzePhotoSchema),
  asyncHandler(cameraController.analyze)
);

router.get(
  '/history/:childId',
  validate(getCameraHistorySchema),
  asyncHandler(cameraController.getHistory)
);

export default router;
