export const prompts = {
  /**
   * Generates prompt template for initial story generation.
   */
  storyGeneration: (childName: string, age: number, prompt: string, language: string) => 
    `Write a magical kid-friendly story in ${language} for a child named ${childName} (age ${age}) based on the prompt: "${prompt}". Output format should be JSON containing title, chapters (array of 5 paragraphs/chapters), and illustration suggestions.`,
    
  /**
   * Generates prompt template for story progression.
   */
  storyContinuation: (previousContent: string, selectedChoice: string, language: string) =>
    `Given the previous story content: "${previousContent}", write the next chapter in ${language} where the character decides to: "${selectedChoice}". Output format should be the chapter text and next set of choices.`,

  /**
   * Generates prompt template for child-friendly vocabulary definitions.
   */
  vocabularyExplanation: (word: string, language: string) =>
    `Explain the word "${word}" in simple terms suitable for a 3-7 year old child in ${language}. Give a simple example sentence using the word.`,

  /**
   * Generates prompt template for quizzes.
   */
  quizGeneration: (storyText: string) =>
    `Based on the following story text: "${storyText}", generate 3 simple multiple-choice questions for a child. Include correct answers and short explanations.`,

  /**
   * Generates prompt template for camera missions.
   */
  cameraMission: (language: string) =>
    `Create a fun exploration camera mission in ${language} for a child. Ask them to find a common household object (like a cup, a shoe, or a leaf) and take a photo of it.`,

  /**
   * Generates prompt template for companion voice conversations.
   */
  voiceConversation: (transcript: string) =>
    `The child says: "${transcript}". Respond in a warm, friendly, encouraging educational tone as Sparky the Fox, keeping the reply short (1-2 sentences) and simple. Also suggest 3 short prompts the child can choose to tap next.`
};
