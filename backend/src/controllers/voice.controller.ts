import { Request, Response } from 'express';
import { voiceService } from '@/services/voice/voice.service';
import { z } from 'zod';

export const voiceChatSchema = z.object({
  body: z.object({
    childId: z.string().uuid('Invalid child ID format'),
    transcript: z.string().min(1, 'Transcript query cannot be empty'),
    language: z.string().min(1, 'Language parameter is required'),
    storyId: z.string().uuid('Invalid story ID format').optional(),
  }),
});

export const getVoiceHistorySchema = z.object({
  params: z.object({
    childId: z.string().uuid('Invalid child ID format'),
  }),
});

export const deleteVoiceHistorySchema = z.object({
  params: z.object({
    childId: z.string().uuid('Invalid child ID format'),
  }),
});

export class VoiceController {
  /**
   * Starts or continues a voice chat conversation with Katha.
   */
  chat = async (req: Request, res: Response): Promise<void> => {
    const { childId, transcript, language, storyId } = req.body;
    const result = await voiceService.processVoiceChat(childId, transcript, language, storyId);
    res.status(200).json({
      success: true,
      reply: result.reply,
      timestamp: result.timestamp,
    });
  };

  /**
   * Retrieves voice conversation history for a child.
   */
  getHistory = async (req: Request, res: Response): Promise<void> => {
    const { childId } = req.params;
    const result = await voiceService.getVoiceHistory(childId);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  /**
   * Deletes all voice history for a child.
   */
  deleteHistory = async (req: Request, res: Response): Promise<void> => {
    const { childId } = req.params;
    await voiceService.deleteVoiceHistory(childId);
    res.status(200).json({
      success: true,
      message: 'Voice history deleted successfully',
    });
  };
}

export const voiceController = new VoiceController();
