import { prisma } from '@/lib/prisma';
import { gemmaService } from '@/services/gemma/gemma.service';
import { logger } from '@/utils/logger';

export class StoryService {
  /**
   * Starts a new story by loading child profile and generating content with Gemma.
   */
  async startStory(childId: string, language: string, prompt: string) {
    logger.info(`Starting story for child ${childId} with prompt "${prompt}"`);

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

    const gemmaResponse = await gemmaService.generateStory({
      childName: child.name,
      age: child.age,
      prompt,
      language,
      difficulty: 'EASY',
    });

    if (!gemmaResponse.success || !gemmaResponse.data) {
      throw new Error(gemmaResponse.error || 'Failed to generate story with Gemma AI');
    }

    const { title, chapters } = gemmaResponse.data;

    const story = await prisma.story.create({
      data: {
        childId,
        title,
        prompt,
        language,
        generatedStory: chapters,
        difficulty: 'EASY',
        status: 'STARTED',
      },
    });

    return {
      storyId: story.id,
      title: story.title,
      story: chapters,
      createdAt: story.createdAt,
    };
  }

  /**
   * Progresses story by taking a user choice, loading context, and asking Gemma to continue.
   */
  async continueStory(storyId: string, choice: string) {
    logger.info(`Continuing story ${storyId} with choice "${choice}"`);

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        child: true,
      },
    });

    if (!story) {
      throw new Error(`Story with ID ${storyId} not found`);
    }

    const previousChapters = story.generatedStory as string[];
    const lastChapter = previousChapters[previousChapters.length - 1] || '';

    const gemmaResponse = await gemmaService.continueStory({
      storyId,
      chapterNumber: previousChapters.length + 1,
      previousContent: lastChapter,
      selectedChoice: choice,
      language: story.language,
    });

    if (!gemmaResponse.success || !gemmaResponse.data) {
      throw new Error(gemmaResponse.error || 'Failed to continue story with Gemma AI');
    }

    const newChapter = gemmaResponse.data;
    const updatedChapters = [...previousChapters, newChapter];

    await prisma.storyChoice.create({
      data: {
        storyId,
        selectedChoice: choice,
        generatedContinuation: newChapter,
      },
    });

    const updatedStory = await prisma.story.update({
      where: { id: storyId },
      data: {
        generatedStory: updatedChapters,
        status: updatedChapters.length >= 5 ? 'COMPLETED' : 'STARTED',
      },
    });

    return updatedStory;
  }

  /**
   * Fetches single story record.
   */
  async getStory(storyId: string) {
    logger.info(`Fetching story ${storyId}`);
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        choices: true,
      },
    });

    if (!story) {
      throw new Error(`Story with ID ${storyId} not found`);
    }

    return story;
  }

  /**
   * Lists stories of one child ordered newest first.
   */
  async getStoriesByChild(childId: string) {
    logger.info(`Fetching stories for child ${childId}`);
    return prisma.story.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Deletes story.
   */
  async deleteStory(storyId: string) {
    logger.info(`Deleting story ${storyId}`);
    
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new Error(`Story with ID ${storyId} not found`);
    }

    await prisma.story.delete({
      where: { id: storyId },
    });

    return { success: true };
  }

  /**
   * Gets child profile status and counts.
   */
  async getChildProfile(childId: string) {
    logger.info(`Fetching profile for child ${childId}`);
    
    let child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        achievements: true,
        stories: {
          select: { id: true }
        }
      }
    });

    if (!child) {
      // Lazy auto-create if not found, following existing mock parent structure
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
          xp: 350, // initial default xp to preserve baseline demo visual metrics
          streak: 5, // initial default streak
        },
        include: {
          achievements: true,
          stories: {
            select: { id: true }
          }
        }
      });
    }

    return {
      name: child.name,
      age: child.age,
      avatar: child.avatar,
      xp: child.xp,
      streak: child.streak,
      currentLevel: child.currentLevel,
      achievements: child.achievements,
      storiesCount: child.stories.length,
    };
  }

  /**
   * Resets active child progress: deletes stories, voice hist, achievements, logs, resets stats.
   */
  async resetChildProgress(childId: string) {
    logger.info(`Resetting progress for child ${childId}`);

    // Verify child exists first
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new Error(`Child with ID ${childId} not found`);
    }

    // Delete child items
    await prisma.story.deleteMany({ where: { childId } });
    await prisma.voiceHistory.deleteMany({ where: { childId } });
    await prisma.achievement.deleteMany({ where: { childId } });
    await prisma.xPLog.deleteMany({ where: { childId } });

    // Reset child stats to baseline zero values
    const updatedChild = await prisma.child.update({
      where: { id: childId },
      data: {
        xp: 0,
        streak: 0,
        currentLevel: 1,
      },
    });

    return {
      name: updatedChild.name,
      age: updatedChild.age,
      avatar: updatedChild.avatar,
      xp: updatedChild.xp,
      streak: updatedChild.streak,
      currentLevel: updatedChild.currentLevel,
      achievements: [],
      storiesCount: 0,
    };
  }
}

export const storyService = new StoryService();
