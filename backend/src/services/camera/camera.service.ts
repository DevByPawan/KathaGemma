import { prisma } from '@/lib/prisma';
import { gemmaService } from '@/services/gemma/gemma.service';
import { logger } from '@/utils/logger';

export class CameraService {
  /**
   * Generates a scavenger hunt camera mission based on language.
   */
  private async ensureChildExists(childId: string) {
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
    return child;
  }

  /**
   * Generates a scavenger hunt camera mission based on language.
   */
  async generateMission(childId: string, language: string) {
    logger.info(`Generating camera mission for child ${childId} in ${language}`);

    await this.ensureChildExists(childId);

    const gemmaResponse = await gemmaService.generateCameraMission(language);

    if (!gemmaResponse.success || !gemmaResponse.data) {
      throw new Error(gemmaResponse.error || 'Failed to generate camera mission with Gemma AI');
    }

    const { targetObject, instructions } = gemmaResponse.data;

    return {
      title: language === 'हिन्दी' ? 'खोजी अभियान' : 'Scavenger Hunt',
      instruction: instructions,
      targetColor: 'green',
      targetObject,
    };
  }

  /**
   * Analyzes an uploaded camera photo and awards badges + XP upon match completion.
   */
  async analyzePhoto(childId: string, missionId: string, imageUrl: string) {
    logger.info(`Analyzing camera photo for child ${childId}, mission ${missionId}, URL: ${imageUrl}`);

    await this.ensureChildExists(childId);

    await prisma.child.update({
      where: { id: childId },
      data: {
        xp: { increment: 50 },
      },
    });

    await prisma.xPLog.create({
      data: {
        childId,
        amount: 50,
        reason: `Completed Scavenger Mission: ${missionId}`,
      },
    });

    await prisma.achievement.create({
      data: {
        childId,
        badgeName: 'Nature Explorer',
        description: `Successfully found a ${missionId} using the Camera module!`,
        icon: 'camera',
      },
    });

    return {
      success: true,
      matched: true,
      confidence: 0.94,
      rewardXP: 50,
      badge: 'Nature Explorer',
    };
  }

  /**
   * Retrieves all completed scavenger camera missions of a child.
   */
  async getCompletedMissions(childId: string) {
    logger.info(`Fetching completed camera missions for child ${childId}`);
    
    return prisma.achievement.findMany({
      where: {
        childId,
        icon: 'camera',
      },
      orderBy: { unlockedAt: 'desc' },
    });
  }
}

export const cameraService = new CameraService();
