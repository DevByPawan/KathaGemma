import { prisma } from '@/lib/prisma';
import { gemmaService } from '@/services/gemma/gemma.service';
import { logger } from '@/utils/logger';

export class VoiceService {
  /**
   * Processes a spoken message from a child, gets response from Gemma, and stores history.
   */
  async processVoiceChat(childId: string, transcript: string, language: string, storyId?: string) {
    logger.info(`Processing voice chat for child ${childId} on story ${storyId || 'none'}: "${transcript}"`);

    let child = await prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      const parent = await prisma.user.upsert({
        where: { email: 'mockparent@kathagemma.com' },
        update: {},
        create: {
          fullName: 'Mock Parent',
          email: 'mockparent@kathagemma.com',
          passwordHash: 'hashedpassword',
          role: 'PARENT',
        },
      });

      child = await prisma.child.create({
        data: {
          id: childId,
          parentId: parent.id,
          name: 'Leo',
          age: 6,
          avatar: 'Panda',
          language: 'English',
        },
      });
    }

    const gemmaResponse = await gemmaService.generateVoiceReply(transcript);

    if (!gemmaResponse.success || !gemmaResponse.data) {
      throw new Error(gemmaResponse.error || 'Failed to generate voice reply with Gemma AI');
    }

    const { replyText } = gemmaResponse.data;

    const voiceHistory = await prisma.voiceHistory.create({
      data: {
        childId,
        transcript,
        aiResponse: replyText,
        duration: Math.max(2, Math.round(transcript.length / 5)),
      },
    });

    return {
      reply: replyText,
      timestamp: voiceHistory.createdAt,
    };
  }

  /**
   * Returns voice history logs for a child.
   */
  async getVoiceHistory(childId: string) {
    logger.info(`Fetching voice history for child ${childId}`);
    return prisma.voiceHistory.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Deletes all voice logs of a child.
   */
  async deleteVoiceHistory(childId: string) {
    logger.info(`Deleting all voice history for child ${childId}`);
    
    await prisma.voiceHistory.deleteMany({
      where: { childId },
    });

    return { success: true };
  }
}

export const voiceService = new VoiceService();
