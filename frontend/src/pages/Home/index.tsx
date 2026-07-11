import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Flame, Sparkles, BookOpen, Mic, ChevronRight,
  Camera, Star, Trophy,
} from 'lucide-react';
import { startNewStory } from '@/services/story';
import { useAppShellContext } from '@/components/layout/AppShell';

// ─── Animation Variants ──────────────────────────────────────────────────────

const EASE_EXPRESSIVE = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: EASE_EXPRESSIVE },
  }),
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: (i: number = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.45, delay: i * 0.08, ease: EASE_EXPRESSIVE },
  }),
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

// ─── Illustrations ────────────────────────────────────────────────────────────

/** Katha the Gemma AI character — friendly panda companion */
const KathaCharacter = () => (
  <motion.g>
    {/* Body */}
    <ellipse cx="60" cy="118" rx="26" ry="22" fill="#1a1a2e" />
    <ellipse cx="60" cy="112" rx="24" ry="26" fill="#f0f0f0" />
    {/* Belly */}
    <ellipse cx="60" cy="116" rx="14" ry="16" fill="#e8e8e8" />
    {/* Arms */}
    <ellipse cx="34" cy="112" rx="10" ry="7" fill="#1a1a2e" transform="rotate(-20 34 112)" />
    <ellipse cx="86" cy="112" rx="10" ry="7" fill="#1a1a2e" transform="rotate(20 86 112)" />
    {/* Legs */}
    <ellipse cx="50" cy="134" rx="9" ry="6" fill="#1a1a2e" />
    <ellipse cx="70" cy="134" rx="9" ry="6" fill="#1a1a2e" />
    {/* Head */}
    <circle cx="60" cy="72" r="32" fill="#f0f0f0" />
    {/* Ears */}
    <circle cx="30" cy="46" r="14" fill="#1a1a2e" />
    <circle cx="90" cy="46" r="14" fill="#1a1a2e" />
    <circle cx="30" cy="46" r="8" fill="#f0f0f0" opacity="0.3" />
    <circle cx="90" cy="46" r="8" fill="#f0f0f0" opacity="0.3" />
    {/* Eye patches */}
    <ellipse cx="48" cy="70" rx="11" ry="10" fill="#1a1a2e" />
    <ellipse cx="72" cy="70" rx="11" ry="10" fill="#1a1a2e" />
    {/* Eyes */}
    <circle cx="48" cy="70" r="6" fill="white" />
    <circle cx="72" cy="70" r="6" fill="white" />
    <circle cx="50" cy="69" r="3.5" fill="#1a1a2e" />
    <circle cx="74" cy="69" r="3.5" fill="#1a1a2e" />
    {/* Sparkle in eyes */}
    <circle cx="51.5" cy="67.5" r="1.2" fill="white" />
    <circle cx="75.5" cy="67.5" r="1.2" fill="white" />
    {/* Nose */}
    <ellipse cx="60" cy="80" rx="5" ry="3.5" fill="#1a1a2e" />
    {/* Smile */}
    <path d="M 52 85 Q 60 92 68 85" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    {/* Blushing cheeks */}
    <ellipse cx="40" cy="78" rx="7" ry="4" fill="#FFB7C5" opacity="0.6" />
    <ellipse cx="80" cy="78" rx="7" ry="4" fill="#FFB7C5" opacity="0.6" />
    {/* Magic wand */}
    <line x1="88" y1="90" x2="108" y2="62" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
    <polygon points="108,56 112,64 104,64" fill="#FBBF24" />
    <circle cx="108" cy="58" r="5" fill="#FBBF24" opacity="0.4" />
    {/* Sparkles from wand */}
    <circle cx="118" cy="48" r="2.5" fill="#FBBF24" />
    <circle cx="114" cy="42" r="1.5" fill="#fff" />
    <circle cx="122" cy="55" r="1.5" fill="#4F46E5" />
  </motion.g>
);

/** Floating cloud shape */
const Cloud = ({ cx, cy, scale = 1, opacity = 0.6 }: { cx: number; cy: number; scale?: number; opacity?: number }) => (
  <g transform={`translate(${cx}, ${cy}) scale(${scale})`} opacity={opacity}>
    <ellipse cx="0" cy="0" rx="20" ry="12" fill="white" />
    <ellipse cx="-12" cy="2" rx="14" ry="10" fill="white" />
    <ellipse cx="14" cy="2" rx="14" ry="10" fill="white" />
    <ellipse cx="0" cy="4" rx="22" ry="10" fill="white" />
  </g>
);

/** Hero illustration container with floating animation */
const HeroIllustration = () => {
  return (
    <div className="relative w-full flex justify-center items-end" style={{ height: 200 }}>
      <svg viewBox="0 0 280 200" className="w-full max-w-sm" aria-hidden="true">
        {/* Sky gradient */}
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
          <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width="280" height="200" fill="url(#skyGrad)" rx="24" />

        {/* Stars */}
        {[
          [20, 20], [50, 10], [100, 15], [170, 8], [220, 20], [250, 12],
          [30, 50], [80, 35], [130, 28], [200, 40], [240, 55],
          [15, 80], [260, 70], [140, 55],
        ].map(([x, y], i) => (
          <motion.circle
            key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.8 : 1.2}
            fill="white"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: i * 0.3 }}
          />
        ))}

        {/* Moon */}
        <circle cx="238" cy="36" r="20" fill="url(#moonGlow)" />
        <circle cx="238" cy="36" r="14" fill="#FEF3C7" />
        <circle cx="244" cy="30" r="10" fill="#1e1b4b" />

        {/* Floating clouds */}
        <motion.g animate={{ x: [0, 5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
          <Cloud cx={50} cy={70} scale={0.7} opacity={0.15} />
        </motion.g>
        <motion.g animate={{ x: [0, -4, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
          <Cloud cx={200} cy={55} scale={0.9} opacity={0.1} />
        </motion.g>

        {/* Glow under character */}
        <ellipse cx="140" cy="175" rx="50" ry="12" fill="url(#glowGrad)" />

        {/* Ground */}
        <ellipse cx="140" cy="178" rx="80" ry="18" fill="#4338ca" opacity="0.4" />

        {/* Character */}
        <motion.g
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <g transform="translate(100, 40) scale(0.65)">
            <KathaCharacter />
          </g>
        </motion.g>

        {/* Magic sparkles floating */}
        {[
          { cx: 60, cy: 100, size: 8, color: '#FBBF24', delay: 0 },
          { cx: 220, cy: 120, size: 6, color: '#14B8A6', delay: 0.5 },
          { cx: 45, cy: 140, size: 5, color: '#4F46E5', delay: 1 },
          { cx: 235, cy: 90, size: 7, color: '#FBBF24', delay: 1.5 },
        ].map((s, i) => (
          <motion.g key={i}
            animate={{ y: [0, -12, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
          >
            {/* Star sparkle */}
            <path
              d={`M${s.cx},${s.cy - s.size} L${s.cx + s.size * 0.3},${s.cy - s.size * 0.3} L${s.cx + s.size},${s.cy} L${s.cx + s.size * 0.3},${s.cy + s.size * 0.3} L${s.cx},${s.cy + s.size} L${s.cx - s.size * 0.3},${s.cy + s.size * 0.3} L${s.cx - s.size},${s.cy} L${s.cx - s.size * 0.3},${s.cy - s.size * 0.3} Z`}
              fill={s.color}
            />
          </motion.g>
        ))}
      </svg>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated counter that counts up on mount */
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    const duration = 800;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}{suffix}</>;
}


/** Progress bar component */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: 'linear-gradient(90deg, #4F46E5, #14B8A6)' }}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

/** Glowing button with press animation */
function GlowButton({
  children, onClick, disabled = false, className = '', glowColor = '#4F46E5',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  glowColor?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.96 }}
      className={`relative overflow-hidden font-bold rounded-full outline-none select-none transition-all focus-visible:ring-4 focus-visible:ring-primary/40 disabled:opacity-60 disabled:pointer-events-none ${className}`}
      style={{ boxShadow: `0 8px 24px ${glowColor}50` }}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </motion.button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const { profile, reloadProfile } = useAppShellContext();
  const [isListening, setIsListening] = useState(false);
  const [isStartingStory, setIsStartingStory] = useState(false);

  // ── Existing handlers — PRESERVED EXACTLY ──
  const handleCreateStory = async () => {
    try {
      setIsStartingStory(true);
      const language = localStorage.getItem('katha_language') || 'English';
      // Pick a random prompt so every adventure is unique
      const STORY_PROMPTS = [
        'A brave little mouse discovers a hidden library inside a giant oak tree.',
        'A baby elephant who can paint beautiful pictures with her trunk goes on an art quest.',
        'A young girl finds a friendly dragon living under her bed who loves to read books.',
        'A curious monkey in the jungle learns to count stars and makes new friends.',
        'A tiny firefly who cannot glow discovers her true superpower on a dark stormy night.',
        'A magical cloud that rains candy teaches a village about sharing and kindness.',
        'A penguin from Antarctica visits a colourful rainforest and learns about different animals.',
        'A young boy who can talk to plants helps save his garden from a mischievous caterpillar.',
        'A little robot with a big heart learns what friendship means in a city of machines.',
        'A sea turtle who loves music starts the first underwater band in the ocean.',
      ];
      const promptText = STORY_PROMPTS[Math.floor(Math.random() * STORY_PROMPTS.length)]!;
      const newStory = await startNewStory(promptText, language);
      await reloadProfile();
      navigate(`/story?id=${newStory.storyId}`);
    } catch (error) {
      console.error('Failed to start story:', error);
      alert('Failed to start story. Please make sure the backend server is running!');
    } finally {
      setIsStartingStory(false);
    }
  };

  const toggleListening = () => setIsListening((prev) => !prev);

  return (
    <div className="space-y-5">
      {/* ── 2. HERO SECTION ───────────────────────────────────────────── */}
      <motion.section
        variants={scaleIn} initial="hidden" animate="visible" custom={1}
        className="relative rounded-[2rem] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
          border: '1px solid rgba(79,70,229,0.3)',
        }}
      >
        {/* Shimmer overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)',
          }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
        />

        {/* Illustration */}
        <HeroIllustration />

        {/* Text content */}
        <div className="px-5 pb-5 space-y-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h1 className="text-2xl font-black text-white leading-tight">
              Hello {profile?.name || 'Leo'}! 👋
            </h1>
            <p className="text-sm text-indigo-200/80 font-medium mt-0.5 leading-snug">
              Today we're going on a magical adventure!
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="flex gap-2 pt-1"
          >
            <GlowButton
              onClick={handleCreateStory}
              disabled={isStartingStory}
              className="flex-1 py-3 text-sm bg-gradient-to-r from-primary to-indigo-500 text-white"
              glowColor="#4F46E5"
            >
              {isStartingStory ? (
                <>
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    ✨
                  </motion.span>
                  Creating…
                </>
              ) : (
                <><Sparkles className="size-4" /> New Adventure</>
              )}
            </GlowButton>

            <GlowButton
              onClick={() => navigate('/voice')}
              className="px-4 py-3 bg-white/10 text-white border border-white/20"
              glowColor="rgba(255,255,255,0.1)"
            >
              <Mic className="size-4" />
            </GlowButton>
          </motion.div>
        </div>
      </motion.section>

      {/* ── 3. DAILY PROGRESS STATS ───────────────────────────────────── */}
      <motion.section variants={staggerContainer} initial="hidden" animate="visible">
        <motion.h2 variants={fadeUp} className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-3">
          Today's Journey
        </motion.h2>

        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Flame, label: 'Streak', value: profile?.streak ?? 5, suffix: '🔥', bg: 'from-orange-500/20 to-red-500/10', border: 'border-orange-500/20', text: 'text-orange-400', iconColor: 'text-orange-400' },
            { icon: Sparkles, label: 'Total XP', value: profile?.xp ?? 350, suffix: '', bg: 'from-amber-500/20 to-yellow-500/10', border: 'border-amber-500/20', text: 'text-amber-400', iconColor: 'text-amber-400' },
            { icon: BookOpen, label: 'Stories', value: profile?.storiesCount ?? 3, suffix: '', bg: 'from-blue-500/20 to-indigo-500/10', border: 'border-blue-500/20', text: 'text-blue-400', iconColor: 'text-blue-400' },
            { icon: Trophy, label: 'Badges', value: profile?.achievements?.length ?? 2, suffix: '', bg: 'from-purple-500/20 to-violet-500/10', border: 'border-purple-500/20', text: 'text-purple-400', iconColor: 'text-purple-400' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={scaleIn} custom={i}
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border bg-gradient-to-b from-zinc-900/40 to-zinc-950/20 border-zinc-800 text-center gap-1.5 cursor-default"
            >
              <stat.icon className={`size-4 ${stat.iconColor}`} />
              <p className={`text-base font-black leading-none ${stat.text}`}>
                <AnimatedCounter value={stat.value} />
              </p>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider leading-none">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── 4. CONTINUE STORY CARD ────────────────────────────────────── */}
      <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={4}>
        <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-3">Continue Story</h2>

        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative rounded-[1.75rem] overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f2027 100%)',
            border: '1px solid rgba(79,70,229,0.25)',
            boxShadow: '0 12px 40px rgba(79,70,229,0.2)',
          }}
          onClick={handleCreateStory}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateStory()}
          aria-label="Continue story: The Whispering Woods"
        >
          {/* Top gradient bar */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-purple-500 to-secondary" />

          <div className="p-5 space-y-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              {/* Story thumbnail */}
              <div
                className="size-16 rounded-2xl flex-shrink-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #312e81, #1e1b4b)' }}
              >
                <svg viewBox="0 0 60 60" className="size-10" aria-hidden="true">
                  <circle cx="30" cy="30" r="28" fill="#1e1b4b" />
                  <polygon points="30,8 40,28 20,28" fill="#059669" />
                  <polygon points="24,20 34,38 14,38" fill="#047857" />
                  <polygon points="36,20 46,38 26,38" fill="#065f46" />
                  <path d="M20,40 Q30,32 40,40" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="30" cy="48" r="3.5" fill="#F97316" />
                  <circle cx="30" cy="44" r="2" fill="#FED7AA" />
                </svg>
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-secondary bg-secondary/15 px-2 py-0.5 rounded-full">
                    In Progress
                  </span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight">The Whispering Woods</h3>
                <p className="text-xs text-zinc-400 font-medium">Chapter 3 · Help Sparky escape the maze</p>
              </div>

              <motion.div
                whileHover={{ x: 2 }}
                className="size-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"
              >
                <ChevronRight className="size-4 text-primary" />
              </motion.div>
            </div>

            {/* Progress row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-semibold">Progress</span>
                <span className="text-primary font-black">60%</span>
              </div>
              <ProgressBar progress={60} />
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <Star className="size-3.5 text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold text-zinc-400">+50 XP on finish</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-zinc-500" />
                <span className="text-xs font-bold text-zinc-400">~5 min read</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── 5. TODAY'S ADVENTURES ─────────────────────────────────────── */}
      <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={5}>
        <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-3">Today's Adventures</h2>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            {
              icon: BookOpen,
              emoji: '📖',
              title: 'Read Story',
              subtitle: 'Choose a tale',
              grad: 'from-indigo-600/80 to-purple-600/80',
              border: 'border-indigo-500/20',
              glow: '#4F46E5',
              onClick: handleCreateStory,
              svgPath: (
                <svg viewBox="0 0 48 48" className="size-8" aria-hidden="true">
                  <rect x="8" y="6" width="22" height="30" rx="3" fill="white" opacity="0.9" />
                  <rect x="10" y="10" width="18" height="2" rx="1" fill="#4F46E5" />
                  <rect x="10" y="14" width="14" height="2" rx="1" fill="#4F46E5" opacity="0.6" />
                  <rect x="10" y="18" width="16" height="2" rx="1" fill="#4F46E5" opacity="0.6" />
                  <circle cx="36" cy="34" r="8" fill="#FBBF24" />
                  <path d="M33 34 L35.5 36.5 L39 31" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              ),
            },
            {
              icon: Mic,
              emoji: '🎤',
              title: 'Talk to Katha',
              subtitle: 'Ask anything',
              grad: 'from-teal-600/80 to-cyan-600/80',
              border: 'border-teal-500/20',
              glow: '#14B8A6',
              onClick: toggleListening,
              svgPath: (
                <svg viewBox="0 0 48 48" className="size-8" aria-hidden="true">
                  <circle cx="24" cy="18" r="8" fill="white" opacity="0.9" />
                  <rect x="20" y="10" width="8" height="16" rx="4" fill="#14B8A6" opacity="0.8" />
                  <path d="M14 22 Q14 34 24 34 Q34 34 34 22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
                  <line x1="24" y1="34" x2="24" y2="40" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
                  <line x1="18" y1="40" x2="30" y2="40" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
                  {[16, 20, 24, 28, 32].map((x, i) => (
                    <motion.line key={i} x1={x} y1={24 - (i % 2 === 0 ? 4 : 2)} x2={x} y2={24 + (i % 2 === 0 ? 4 : 2)}
                      stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"
                      animate={{ scaleY: [1, 1.8, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </svg>
              ),
            },
            {
              icon: Camera,
              emoji: '📷',
              title: 'Camera Mission',
              subtitle: 'Find objects',
              grad: 'from-orange-600/80 to-pink-600/80',
              border: 'border-orange-500/20',
              glow: '#F97316',
              onClick: () => navigate('/voice'),
              svgPath: (
                <svg viewBox="0 0 48 48" className="size-8" aria-hidden="true">
                  <rect x="6" y="14" width="36" height="26" rx="5" fill="white" opacity="0.9" />
                  <rect x="6" y="14" width="36" height="26" rx="5" fill="#F97316" opacity="0.15" />
                  <circle cx="24" cy="28" r="8" fill="none" stroke="#F97316" strokeWidth="2.5" />
                  <circle cx="24" cy="28" r="4" fill="#F97316" opacity="0.7" />
                  <rect x="18" y="10" width="8" height="4" rx="2" fill="white" opacity="0.8" />
                  <circle cx="36" cy="20" r="2.5" fill="#FBBF24" />
                </svg>
              ),
            },
          ].map((card, i) => (
            <motion.button
              key={card.title}
              type="button"
              onClick={card.onClick}
              variants={scaleIn} custom={i}
              initial="hidden" animate="visible"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.93 }}
              className={`relative flex flex-col items-center justify-center p-3 pt-4 rounded-2xl border bg-gradient-to-b ${card.grad} ${card.border} text-center gap-2 outline-none select-none overflow-hidden`}
              style={{ boxShadow: `0 6px 20px ${card.glow}25` }}
              aria-label={card.title}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)' }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 4 + i }}
              />
              {card.svgPath}
              <div className="space-y-0.5">
                <p className="text-[11px] font-black text-white leading-none">{card.title}</p>
                <p className="text-[9px] font-semibold text-white/60 leading-none">{card.subtitle}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ── 6. AI COMPANION CARD ──────────────────────────────────────── */}
      <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={6}>
        <motion.div
          className="relative rounded-[1.75rem] overflow-hidden p-5"
          style={{
            background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 100%)',
            border: '1px solid rgba(20,184,166,0.2)',
          }}
          whileHover={{ y: -2 }}
        >
          <div className="absolute -top-8 -right-8 size-40 pointer-events-none">
            <motion.div
              className="size-40 rounded-full border-2 border-secondary/10"
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <motion.button
                type="button"
                onClick={toggleListening}
                aria-pressed={isListening}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="relative size-16 rounded-full flex items-center justify-center outline-none cursor-pointer"
                style={{
                  background: isListening
                    ? 'linear-gradient(135deg, #14B8A6, #0f766e)'
                    : 'linear-gradient(135deg, #4F46E5, #7c3aed)',
                  boxShadow: isListening
                    ? '0 0 30px rgba(20,184,166,0.5)'
                    : '0 0 24px rgba(79,70,229,0.4)',
                }}
              >
                <AnimatePresence>
                  {isListening && (
                    <>
                      {[1, 2, 3].map((r) => (
                        <motion.div
                          key={r}
                          className="absolute inset-0 rounded-full border-2 border-secondary/40"
                          initial={{ scale: 1, opacity: 0.6 }}
                          animate={{ scale: 1 + r * 0.4, opacity: 0 }}
                          transition={{ duration: 2, repeat: Infinity, delay: (r - 1) * 0.5 }}
                        />
                      ))}
                    </>
                  )}
                </AnimatePresence>
                <Mic className={`size-7 text-white ${isListening ? 'animate-pulse' : ''}`} />
              </motion.button>
            </div>

            <div className="flex-1 space-y-1">
              <h3 className="text-base font-black text-white leading-none">Talk to Katha</h3>
              <p className="text-xs text-zinc-400 font-medium leading-snug">
                {isListening ? (
                  <motion.span
                    key="listening"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-secondary font-semibold"
                  >
                    🎤 Listening… say something!
                  </motion.span>
                ) : (
                  'Ask anything — stories, questions, fun facts!'
                )}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Tell a story', 'Explain stars', 'Sing a song'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { if (!isListening) toggleListening(); }}
                    className="text-[10px] font-bold px-2 py-1 rounded-full border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all active:scale-95 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}
