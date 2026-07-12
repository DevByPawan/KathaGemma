import { prisma } from '@/lib/prisma';
import { gemmaService } from '@/services/gemma/gemma.service';
import { logger } from '@/utils/logger';
import { REWARDS_CONFIG } from './rewards.config';

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

    const { title, chapters, choices } = gemmaResponse.data;

    // Structured storage of chapter objects
    const firstChapterObj = {
      chapterNumber: 1,
      title: 'Chapter 1',
      content: chapters[0],
      choices: choices || [],
      createdAt: new Date().toISOString()
    };

    const story = await prisma.story.create({
      data: {
        childId,
        title,
        prompt,
        language,
        generatedStory: [firstChapterObj],
        difficulty: 'EASY',
        status: 'STARTED',
      },
    });

    return {
      id: story.id,
      title: story.title,
      prompt: story.prompt,
      language: story.language,
      generatedStory: [chapters[0]],
      choices: choices || [],
      difficulty: story.difficulty,
      status: story.status,
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

    const previousChapters = Array.isArray(story.generatedStory) ? story.generatedStory : [];
    
    // Concatenate previous contents for history context
    const allPreviousText = previousChapters.map((ch: any) => {
      if (ch && typeof ch === 'object' && 'content' in ch) {
        return ch.content;
      }
      return String(ch);
    }).join('\n\n');

    const nextChapterNumber = previousChapters.length + 1;

    const gemmaResponse = await gemmaService.continueStory({
      storyId,
      chapterNumber: nextChapterNumber,
      previousContent: allPreviousText,
      selectedChoice: choice,
      language: story.language,
    });

    if (!gemmaResponse.success || !gemmaResponse.data) {
      throw new Error(gemmaResponse.error || 'Failed to continue story with Gemma AI');
    }

    const { chapter: nextText, choices: nextChoices } = gemmaResponse.data;

    // Structured storage of new chapter
    const nextChapterObj = {
      chapterNumber: nextChapterNumber,
      title: `Chapter ${nextChapterNumber}`,
      content: nextText,
      choices: nextChoices || [],
      createdAt: new Date().toISOString()
    };

    const updatedChapters = [...previousChapters, nextChapterObj];

    await prisma.storyChoice.create({
      data: {
        storyId,
        selectedChoice: choice,
        generatedContinuation: nextText,
      },
    });

    const isCompleted = updatedChapters.length >= 5;

    const updatedStory = await prisma.story.update({
      where: { id: storyId },
      data: {
        generatedStory: updatedChapters,
        status: isCompleted ? 'COMPLETED' : 'STARTED',
      },
    });

    // Reward achievements and XP logs dynamically based on REWARDS_CONFIG
    if (isCompleted) {
      await prisma.child.update({
        where: { id: story.childId },
        data: {
          xp: { increment: REWARDS_CONFIG.STORY_COMPLETION_XP },
        },
      });

      await prisma.xPLog.create({
        data: {
          childId: story.childId,
          amount: REWARDS_CONFIG.STORY_COMPLETION_XP,
          reason: `Completed Story: ${story.title}`,
        },
      });

      const existingBadge = await prisma.achievement.findFirst({
        where: {
          childId: story.childId,
          badgeName: REWARDS_CONFIG.STORY_COMPLETION_BADGE,
          icon: 'book',
        },
      });

      if (!existingBadge) {
        await prisma.achievement.create({
          data: {
            childId: story.childId,
            badgeName: REWARDS_CONFIG.STORY_COMPLETION_BADGE,
            description: `Successfully finished reading the book "${story.title}"!`,
            icon: 'book',
          },
        });
      }
    }

    const chapterTexts = updatedChapters.map((ch: any) => ch.content || String(ch));

    return {
      id: updatedStory.id,
      title: updatedStory.title,
      prompt: updatedStory.prompt,
      language: updatedStory.language,
      generatedStory: chapterTexts,
      choices: isCompleted ? [] : (nextChoices || []),
      difficulty: updatedStory.difficulty,
      status: updatedStory.status,
      createdAt: updatedStory.createdAt,
    };
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

    return formatStoryResponse(story);
  }

  /**
   * Lists stories of one child ordered newest first.
   */
  async getStoriesByChild(childId: string) {
    logger.info(`Fetching stories for child ${childId}`);
    const stories = await prisma.story.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
    });
    return stories.map(s => formatStoryResponse(s));
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

function formatStoryResponse(story: any) {
  const dbChapters = Array.isArray(story.generatedStory) ? story.generatedStory : [];
  
  const chaptersText: string[] = [];
  let currentChoices: any[] = [];
  
  dbChapters.forEach((ch: any) => {
    if (ch && typeof ch === 'object' && 'content' in ch) {
      chaptersText.push(ch.content);
      currentChoices = Array.isArray(ch.choices) ? ch.choices : [];
    } else if (ch && typeof ch === 'object' && 'text' in ch) {
      chaptersText.push(ch.text);
      currentChoices = Array.isArray(ch.choices) ? ch.choices : [];
    } else if (typeof ch === 'string') {
      chaptersText.push(ch);
      currentChoices = [
        { id: 'continue', text: 'Continue the adventure' },
        { id: 'different', text: 'Take a different path' },
        { id: 'end', text: 'End the story here' }
      ];
    }
  });

  return {
    id: story.id,
    childId: story.childId,
    title: story.title,
    prompt: story.prompt,
    language: story.language,
    generatedStory: chaptersText,
    choices: story.status === 'COMPLETED' ? [] : currentChoices,
    difficulty: story.difficulty,
    status: story.status,
    createdAt: story.createdAt,
  };
}
