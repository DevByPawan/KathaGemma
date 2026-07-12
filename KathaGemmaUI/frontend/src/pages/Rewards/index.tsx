import { motion } from 'framer-motion';
import { Trophy, Flame, Zap, Award, Lock, Sparkles } from 'lucide-react';
import { useAppShellContext } from '@/components/layout/AppShell';

interface BadgeDefinition {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const ALL_BADGES: BadgeDefinition[] = [
  {
    name: 'Nature Explorer',
    description: 'Found a target object in the real world using the camera.',
    icon: Trophy,
    color: 'from-green-500 to-emerald-600',
  },
  {
    name: 'Story Weaver',
    description: 'Completed your first interactive story adventure.',
    icon: Award,
    color: 'from-indigo-500 to-purple-600',
  },
  {
    name: 'Chatterbox',
    description: 'Had a conversation with Katha using the voice assistant.',
    icon: Sparkles,
    color: 'from-amber-500 to-yellow-600',
  },
];

export default function Rewards() {
  const { profile, isLoading } = useAppShellContext();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="text-sm font-bold text-zinc-500">Loading rewards...</span>
      </div>
    );
  }

  const childProfile = profile || { xp: 0, streak: 0, currentLevel: 1, achievements: [] };
  const unlockedBadges = childProfile.achievements || [];

  // Gamified XP Level Progress
  // Level 1: 0 - 100 XP
  // Level 2: 101 - 500 XP
  // Level 3: 501 - 1000 XP
  const xp = childProfile.xp;
  let level = childProfile.currentLevel;
  let levelMin = 0;
  let levelMax = 100;

  if (xp > 500) {
    level = 3;
    levelMin = 500;
    levelMax = 1000;
  } else if (xp > 100) {
    level = 2;
    levelMin = 100;
    levelMax = 500;
  } else {
    level = 1;
    levelMin = 0;
    levelMax = 100;
  }

  const progress = Math.min(100, Math.max(0, ((xp - levelMin) / (levelMax - levelMin)) * 100));

  return (
    <div className="space-y-6 pb-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-white">Your Achievements</h2>
        <p className="text-xs text-zinc-500 font-semibold mt-0.5">Track your XP, badges, and learning streaks</p>
      </div>

      {/* Gamified stats panel */}
      <div className="grid grid-cols-2 gap-4">
        {/* Streak card */}
        <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <div className="size-11 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
            <Flame className="size-5 fill-current" />
          </div>
          <div className="space-y-0.5">
            <p className="text-lg font-black text-white">{childProfile.streak} Days</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Active Streak</p>
          </div>
        </div>

        {/* Level card */}
        <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <div className="size-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Zap className="size-5 fill-current" />
          </div>
          <div className="space-y-0.5">
            <p className="text-lg font-black text-white">{xp} XP</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Points</p>
          </div>
        </div>
      </div>

      {/* Level Progress Bar */}
      <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Level {level}</span>
          <span className="text-xs font-black text-primary uppercase tracking-widest">{xp} / {levelMax} XP</span>
        </div>
        <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500"
          />
        </div>
        <p className="text-[10px] text-zinc-500 font-semibold text-center mt-1">
          {levelMax - xp > 0 ? `Earn ${levelMax - xp} more XP to unlock Level ${level + 1}!` : 'Max Level Reached!'}
        </p>
      </div>

      {/* Badges list */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Badges unlocked</h3>

        <div className="space-y-3">
          {ALL_BADGES.map((badge) => {
            // Check if backend unlocked achievements list contains this badgeName
            const isUnlocked = unlockedBadges.some(
              (achievement) => achievement.badgeName.toLowerCase() === badge.name.toLowerCase()
            );
            const IconComponent = badge.icon;

            return (
              <div
                key={badge.name}
                className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300
                  ${isUnlocked
                    ? 'border-zinc-800 bg-zinc-900/40 shadow-md'
                    : 'border-zinc-900 bg-zinc-900/10 opacity-60'
                  }`}
              >
                {/* Badge Emblem */}
                <div
                  className={`size-14 rounded-2xl flex items-center justify-center flex-shrink-0 relative overflow-hidden
                    ${isUnlocked
                      ? `bg-gradient-to-br ${badge.color} text-white shadow-lg shadow-primary/20`
                      : 'bg-zinc-800 text-zinc-500'
                    }`}
                >
                  <IconComponent className="size-7 relative z-10" />
                  {isUnlocked && (
                    <motion.div
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                    />
                  )}
                </div>

                {/* Badge Info */}
                <div className="flex-1 space-y-0.5">
                  <h4 className="text-sm font-black text-white leading-tight">{badge.name}</h4>
                  <p className="text-xs text-zinc-500 font-medium leading-normal">{badge.description}</p>
                </div>

                {/* Status indicator */}
                <div className="flex-shrink-0">
                  {isUnlocked ? (
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                      Unlocked
                    </span>
                  ) : (
                    <div className="size-7 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600">
                      <Lock className="size-3.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
