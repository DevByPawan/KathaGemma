import { Router } from 'express';
import {
  voiceController,
  voiceChatSchema,
  getVoiceHistorySchema,
  deleteVoiceHistorySchema,
} from '@/controllers/voice.controller';
import { validate } from '@/middlewares/validate';
import { asyncHandler } from '@/middlewares/error';

const router = Router();

router.post(
  '/chat',
  validate(voiceChatSchema),
  asyncHandler(voiceController.chat)
);

router.get(
  '/history/:childId',
  validate(getVoiceHistorySchema),
  asyncHandler(voiceController.getHistory)
);

router.delete(
  '/history/:childId',
  validate(deleteVoiceHistorySchema),
  asyncHandler(voiceController.deleteHistory)
);

export default router;
