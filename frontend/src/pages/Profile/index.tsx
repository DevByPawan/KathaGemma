import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, RefreshCw, Star, Settings, Languages, Loader2 } from 'lucide-react';
import { resetChildProgress } from '@/services/story';
import { useAppShellContext } from '@/components/layout/AppShell';

export default function Profile() {
  const { profile, reloadProfile, isLoading } = useAppShellContext();
  const [difficulty, setDifficulty] = useState('Easy');
  const [safeFilter, setSafeFilter] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const savedDiff = localStorage.getItem('katha_difficulty') || 'Easy';
    setDifficulty(savedDiff);
    const savedFilter = localStorage.getItem('katha_safe_filter') !== 'false';
    setSafeFilter(savedFilter);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="text-sm font-bold text-zinc-500">Loading profile...</span>
      </div>
    );
  }

  const childProfile = profile || { name: 'Leo', age: 6, avatar: 'Panda', xp: 0, streak: 0, currentLevel: 1, achievements: [] };
  const buddyId = localStorage.getItem('katha_avatar') || 'panda';
  const language = localStorage.getItem('katha_language') || 'en';

  const buddyNames: Record<string, string> = {
    panda: 'Pipo the Panda 🐼',
    elephant: 'Elly the Elephant 🐘',
    fox: 'Fiona the Fox 🦊',
    parrot: 'Pip the Parrot 🦜',
  };

  const handleDifficultyChange = (val: string) => {
    setDifficulty(val);
    localStorage.setItem('katha_difficulty', val);
  };

  const handleToggleFilter = () => {
    const newVal = !safeFilter;
    setSafeFilter(newVal);
    localStorage.setItem('katha_safe_filter', String(newVal));
  };

  const handleResetProgress = async () => {
    if (!confirm('Are you sure you want to reset your learning progress? This will delete your story list and wipe your XP and stats back to zero.')) {
      return;
    }

    try {
      setIsResetting(true);
      await resetChildProgress();
      await reloadProfile(); // Refresh the AppShell context state with backend values
      alert('Your progress has been reset successfully!');
    } catch (error) {
      console.error('Failed to reset child progress:', error);
      alert('Failed to reset progress. Please verify the backend database is running!');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-white">Learner Profile</h2>
        <p className="text-xs text-zinc-500 font-semibold mt-0.5">Manage your settings and learning buddy</p>
      </div>

      {/* Child info card */}
      <div className="p-5 rounded-3xl border border-zinc-800 bg-zinc-900/40 space-y-4">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-black shadow-md">
            {childProfile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{childProfile.name}</h3>
            <p className="text-xs text-zinc-500 font-semibold">Age {childProfile.age} · Companion: {buddyNames[buddyId] || 'Pipo the Panda'}</p>
          </div>
        </div>

        {/* Local Settings status */}
        <div className="border-t border-zinc-800/80 pt-4 grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Language Preference</span>
            <div className="flex items-center gap-1.5 text-zinc-200 text-sm font-bold mt-0.5">
              <Languages className="size-4 text-zinc-400" />
              <span>{language === 'hi' ? 'Hindi (हिन्दी)' : language === 'bn' ? 'Bengali (বাংলা)' : 'English'}</span>
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Level Status</span>
            <div className="flex items-center gap-1.5 text-zinc-200 text-sm font-bold mt-0.5">
              <Star className="size-4 text-amber-400 fill-amber-400" />
              <span>Level {childProfile.currentLevel} Learner</span>
            </div>
          </div>
        </div>
      </div>

      {/* Parent Zone Settings card */}
      <div className="p-5 rounded-3xl border border-zinc-800 bg-zinc-900/40 space-y-5">
        <div className="flex items-center gap-2 text-zinc-400">
          <Shield className="size-5 text-primary" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Parent Control Zone</h3>
        </div>

        {/* Story Difficulty Config */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
            <Settings className="size-3.5 text-zinc-500" />
            Story Difficulty
          </label>
          <div className="grid grid-cols-3 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            {['Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => handleDifficultyChange(diff)}
                className={`py-1.5 text-xs font-black rounded-lg transition-colors cursor-pointer
                  ${difficulty === diff
                    ? 'bg-primary text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Content safe filter toggle */}
        <div className="flex items-center justify-between border-t border-zinc-850 pt-4">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-zinc-300">Child Content Filter</h4>
            <p className="text-[10px] text-zinc-500 font-semibold">Ensures safety boundaries for Gemini prompt replies.</p>
          </div>
          <button
            type="button"
            onClick={handleToggleFilter}
            aria-pressed={safeFilter}
            className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer
              ${safeFilter ? 'bg-primary' : 'bg-zinc-800'}`}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="size-4.5 rounded-full bg-white shadow-sm"
              style={{ x: safeFilter ? '20px' : '0px' }}
            />
          </button>
        </div>

        {/* Safe reset button */}
        <div className="border-t border-zinc-850 pt-4">
          <button
            type="button"
            disabled={isResetting}
            onClick={handleResetProgress}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-500/20 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResetting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <RefreshCw className="size-4" />
                <span>Reset My Progress</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
