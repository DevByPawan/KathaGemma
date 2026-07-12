import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStoryDetails } from '@/services/story';

const COLORS = ['#4F46E5', '#14B8A6', '#FBBF24', '#EF4444', '#EC4899', '#3B82F6'];

interface ConfettiPiece {
  id: number;
  left: string;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

// Trophy Illustration vector SVG
const TrophyIllustration = () => (
  <motion.div
    initial={{ scale: 0, rotate: -15 }}
    animate={{ scale: 1, rotate: 0 }}
    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
    className="size-48 md:size-52 relative flex items-center justify-center mx-auto"
  >
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      {/* Background radial glow */}
      <circle cx="60" cy="60" r="40" fill="var(--color-accent)" opacity="0.15" className="blur-xl" />
      {/* Handles */}
      <path d="M 30,45 C 15,45 15,70 30,70" fill="none" stroke="var(--color-accent)" strokeWidth="6" strokeLinecap="round" />
      <path d="M 90,45 C 105,45 105,70 90,70" fill="none" stroke="var(--color-accent)" strokeWidth="6" strokeLinecap="round" />
      {/* Base */}
      <rect x="40" y="85" width="40" height="10" rx="4" fill="#78350F" />
      <polygon points="50,85 70,85 60,75" fill="var(--color-accent)" />
      {/* Cup */}
      <path d="M 35,40 L 85,40 Q 85,75 60,75 Q 35,75 35,40 Z" fill="var(--color-accent)" />
      {/* Star symbol on Cup */}
      <path d="M 60,45 L 63,53 L 71,53 L 65,58 L 67,66 L 60,61 L 53,66 L 55,58 L 49,53 L 57,53 Z" fill="#FFFFFF" />
    </svg>
  </motion.div>
);

// Reward display panel
const RewardCard = ({ xpAmount }: { xpAmount: number }) => (
  <motion.div
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 24 }}
    className="w-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-md p-5 rounded-3xl flex items-center justify-between shadow-lg"
  >
    <div className="flex items-center gap-3.5">
      <div className="size-12 rounded-2xl bg-accent/15 flex items-center justify-center text-accent">
        <Sparkles className="size-6 fill-current animate-pulse" />
      </div>
      <div className="space-y-0.5 text-left">
        <p className="text-xl font-black text-white leading-none">+{xpAmount} XP</p>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Experience Points</p>
      </div>
    </div>

    <div className="h-8 w-px bg-zinc-800/80" />

    <div className="flex items-center gap-3.5">
      <div className="size-12 rounded-2xl bg-primary/15 flex items-center justify-center text-primary">
        <svg viewBox="0 0 100 100" className="size-7 fill-current text-primary" aria-hidden="true">
          <polygon points="50,15 80,30 80,70 50,85 20,70 20,30" fill="currentColor" />
          <polygon points="50,22 74,34 74,66 50,78 26,66 26,34" fill="#FFFFFF" opacity="0.2" />
          <circle cx="50" cy="50" r="12" fill="#FFFFFF" />
        </svg>
      </div>
      <div className="space-y-0.5 text-left">
        <p className="text-sm font-black text-white leading-none">Explorer</p>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Badge Unlocked</p>
      </div>
    </div>
  </motion.div>
);

export default function Celebration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storyId = searchParams.get('id');

  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [xpEarned, setXpEarned] = useState(100);

  // Fetch story details to calculate exact XP dynamically
  useEffect(() => {
    const fetchXP = async () => {
      if (storyId) {
        try {
          const details = await getStoryDetails(storyId);
          // 100 XP per chapter completed
          setXpEarned(details.generatedStory.length * 100);
        } catch (error) {
          console.error('Failed to load dynamic XP:', error);
        }
      }
    };
    fetchXP();
  }, [storyId]);

  // Initialize confetti metadata once on mount to avoid type re-renders
  useEffect(() => {
    const pieces = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 8 + 6,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 1.5,
      duration: Math.random() * 2 + 2,
    }));
    setConfetti(pieces);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col justify-between py-10 px-6 relative overflow-hidden">
      
      {/* Background ambient circular overlay lights */}
      <div className="absolute -left-20 -top-20 -z-10 size-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 -z-10 size-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      {/* RENDER FALLING CONFETTI */}
      {confetti.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{ y: -30, x: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: '105vh',
            x: [0, Math.random() * 40 - 20, Math.random() * 40 - 20],
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: 'easeOut',
            repeat: Infinity,
            repeatDelay: Math.random() * 1
          }}
          className="absolute rounded-xs pointer-events-none z-30"
          style={{
            left: piece.left,
            width: piece.size,
            height: piece.id % 2 === 0 ? piece.size : piece.size * 2,
            backgroundColor: piece.color,
          }}
        />
      ))}

      {/* TOP: Success Illustration */}
      <div className="pt-6">
        <TrophyIllustration />
      </div>

      {/* CENTER: Congratulation content & Reward Card */}
      <main className="w-full max-w-md mx-auto my-auto flex flex-col gap-6 text-center z-10">
        <div className="space-y-2">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 }}
            className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-none"
          >
            You Did It! 🎉
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-zinc-400 text-xs md:text-sm font-semibold max-w-xs mx-auto"
          >
            You completed today's magical story adventure!
          </motion.p>
        </div>

        <RewardCard xpAmount={xpEarned} />
      </main>

      {/* BOTTOM: Action Controls */}
      <footer className="w-full max-w-md mx-auto flex flex-col gap-3 z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex flex-col gap-3 w-full"
        >
          <Button
            onClick={() => navigate(`/story?id=${storyId || ''}`)}
            className="w-full text-base font-bold shadow-lg"
            size="lg"
          >
            Continue Adventure
            <ArrowRight className="size-5 ml-1" />
          </Button>

          <Button
            onClick={() => navigate('/home')}
            variant="outline"
            className="w-full text-base font-bold"
            size="lg"
          >
            <Home className="size-5 mr-1" />
            Back to Home
          </Button>
        </motion.div>
      </footer>

    </div>
  );
}
