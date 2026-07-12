import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, Trash2, ArrowRight } from 'lucide-react';
import { getChildStories, startNewStory, deleteStory, type StoryDetailsResponse } from '@/services/story';
import { useAppShellContext } from '@/components/layout/AppShell';

const CATEGORIES = [
  { emoji: '🌳', title: 'Magic Forest', prompt: 'A story about a magical whisper forest with glowing mushrooms.' },
  { emoji: '🚀', title: 'Outer Space', prompt: 'An adventure about flying a cardboard rocket to a planet made of cookies.' },
  { emoji: '🦊', title: 'Animal Band', prompt: 'A story about a clever fox starting an animal music band in the woods.' },
  { emoji: '🤖', title: 'Friendly Robot', prompt: 'An adventure about a tiny robot learning to find its true heart.' },
];

export default function Explore() {
  const navigate = useNavigate();
  const { reloadProfile } = useAppShellContext();
  const [stories, setStories] = useState<StoryDetailsResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingStory, setIsCreatingStory] = useState(false);

  const fetchStories = async () => {
    try {
      setIsLoading(true);
      const data = await getChildStories();
      setStories(data || []);
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleCreateCategoryStory = async (promptText: string) => {
    try {
      setIsCreatingStory(true);
      const language = localStorage.getItem('katha_language') || 'English';
      const newStory = await startNewStory(promptText, language);
      await reloadProfile(); // Refresh XP on creation
      navigate(`/story?id=${newStory.storyId}`);
    } catch (error) {
      console.error('Failed to start story:', error);
      alert('Failed to start story. Please make sure the backend server is running!');
    } finally {
      setIsCreatingStory(false);
    }
  };

  const handleDeleteStory = async (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this story adventure?')) return;
    try {
      await deleteStory(storyId);
      setStories((prev) => prev.filter((story) => story.id !== storyId));
      await reloadProfile(); // Update count in header context
    } catch (error) {
      console.error('Failed to delete story:', error);
    }
  };

  const filteredStories = stories.filter((story) =>
    story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-6">
      {/* Title section */}
      <div>
        <h2 className="text-xl font-black text-white">Adventure Library</h2>
        <p className="text-xs text-zinc-500 font-semibold mt-0.5">Explore quick quests or read your previous stories</p>
      </div>

      {/* Quick Launch Categories */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Quick Themes</h3>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat.title}
              type="button"
              disabled={isCreatingStory}
              onClick={() => handleCreateCategoryStory(cat.prompt)}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="flex flex-col items-center justify-center p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-md text-center gap-2 hover:border-primary/50 transition-all cursor-pointer"
            >
              <span className="text-3xl select-none">{cat.emoji}</span>
              <span className="text-xs font-bold text-white">{cat.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Story Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search your adventures..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-full py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-primary transition-all font-semibold"
        />
      </div>

      {/* Story Library log */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">My Stories</h3>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <span className="text-sm font-bold text-zinc-500">Loading library...</span>
          </div>
        ) : filteredStories.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredStories.map((story) => (
                <motion.div
                  key={story.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => navigate(`/story?id=${story.id}`)}
                  className="flex items-center justify-between p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:border-primary/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <BookOpen className="size-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-black text-white group-hover:text-primary transition-colors leading-tight">
                        {story.title}
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        {story.language} · {story.status}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Delete adventure"
                      onClick={(e) => handleDeleteStory(story.id, e)}
                      className="p-2 rounded-full hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-all cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <div className="size-7 rounded-full bg-zinc-800 flex items-center justify-center">
                      <ArrowRight className="size-3.5 text-zinc-400" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* Real backend Empty State instead of fakes */
          <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10">
            <BookOpen className="size-8 text-zinc-600 mb-2" />
            <p className="text-sm font-bold text-zinc-500">No story adventures found</p>
            <p className="text-[11px] text-zinc-600 font-semibold mt-1">Tap a theme card above to start a new magical tale!</p>
          </div>
        )}
      </div>
    </div>
  );
}
