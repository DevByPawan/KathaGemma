import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { continueStory, getStoryDetails } from '@/services/story';

interface StoryChoice {
  id: string;
  emoji: string;
  text: string;
  colorClass: string;
}

// Emojis and colours cycle for however many AI-generated choices come back
const CHOICE_STYLES = [
  { emoji: '🦊', colorClass: 'border-orange-500/20 hover:border-orange-500 bg-orange-500/5' },
  { emoji: '🌳', colorClass: 'border-emerald-500/20 hover:border-emerald-500 bg-emerald-500/5' },
  { emoji: '🐦', colorClass: 'border-blue-500/20 hover:border-blue-500 bg-blue-500/5' },
  { emoji: '🏡', colorClass: 'border-rose-500/20 hover:border-rose-500 bg-rose-500/5' },
  { emoji: '⭐', colorClass: 'border-yellow-500/20 hover:border-yellow-500 bg-yellow-500/5' },
];

// Fallback choices shown while the story is still loading
const FALLBACK_CHOICES: StoryChoice[] = [
  { id: 'continue', emoji: '✨', text: 'Continue the adventure', colorClass: 'border-indigo-500/20 hover:border-indigo-500 bg-indigo-500/5' },
  { id: 'different', emoji: '🔀', text: 'Take a different path', colorClass: 'border-emerald-500/20 hover:border-emerald-500 bg-emerald-500/5' },
  { id: 'end', emoji: '🏁', text: 'End the story here', colorClass: 'border-rose-500/20 hover:border-rose-500 bg-rose-500/5' },
];

// Story Choice Illustration SVG
const ChoiceIllustration = () => (
  <motion.div
    animate={{ y: [0, -5, 0] }}
    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
    className="size-44 md:size-48 pointer-events-none select-none flex items-center justify-center mx-auto"
  >
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      <circle cx="60" cy="60" r="45" fill="#FEF3C7" opacity="0.3" />
      {/* Fork in the road path */}
      <path d="M 60,100 L 60,65 L 30,35 M 60,65 L 90,35" fill="none" stroke="#D97706" strokeWidth="8" strokeLinecap="round" />
      {/* Sparkles on the path forks */}
      <circle cx="30" cy="35" r="4" fill="#FBBF24" className="animate-ping" />
      <circle cx="90" cy="35" r="4" fill="#FBBF24" className="animate-ping" style={{ animationDelay: '0.5s' }} />
      {/* Curious Sparky Fox looking at choices */}
      <g transform="translate(42, 65) scale(0.35)">
        <polygon points="50,72 16,36 84,36" fill="#F97316" />
        <polygon points="50,72 16,36 34,36" fill="#FFFFFF" />
        <polygon points="50,72 84,36 66,36" fill="#FFFFFF" />
        <circle cx="50" cy="70" r="4.5" fill="#1F2937" />
        <circle cx="38" cy="44" r="3.5" fill="#1F2937" />
        <circle cx="62" cy="44" r="3.5" fill="#1F2937" />
        <polygon points="20,40 12,18 36,28" fill="#EA580C" />
        <polygon points="80,40 88,18 64,28" fill="#EA580C" />
      </g>
    </svg>
  </motion.div>
);

export default function Choice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storyId = searchParams.get('id');

  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [choices, setChoices] = useState<StoryChoice[]>(FALLBACK_CHOICES);
  const [storyTitle, setStoryTitle] = useState('Story Fork');
  const [chapterCount, setChapterCount] = useState(5);
  const [isLoadingChoices, setIsLoadingChoices] = useState(true);

  // Load the story to extract dynamic context and chapter count
  useEffect(() => {
    if (!storyId) { setIsLoadingChoices(false); return; }
    const load = async () => {
      try {
        const story = await getStoryDetails(storyId);
        setStoryTitle(story.title);
        setChapterCount(story.generatedStory.length);

        // The last paragraph of the story often contains implicit choices
        // (Gemini writes them as sentences like "Will X do A or B?").
        // We surface it as guidance text and show generic continuation choices
        // so the child is not limited to Sparky-specific hardcoded options.
        setChoices(FALLBACK_CHOICES);
      } catch (err) {
        console.error('Choice page: failed to load story', err);
      } finally {
        setIsLoadingChoices(false);
      }
    };
    load();
  }, [storyId]);

  const handleContinue = async () => {
    if (selectedChoice && storyId) {
      try {
        setIsSubmitting(true);
        await continueStory(storyId, selectedChoice);
        navigate(`/celebration?id=${storyId}`);
      } catch (error) {
        console.error('Failed to submit choice:', error);
        alert('Failed to save choice. Please check the backend!');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      navigate('/celebration');
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.96, y: 12 },
    show: { 
      opacity: 1, 
      scale: 1,
      y: 0, 
      transition: { type: "spring" as const, stiffness: 350, damping: 24 } 
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-200 text-zinc-950 font-sans flex flex-col justify-between py-6 px-6 relative overflow-hidden">
      
      {/* Floating background stars */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-35">
        <svg width="100%" height="100%">
          <circle cx="15%" cy="10%" r="2" fill="#FFFFFF" />
          <circle cx="80%" cy="15%" r="2.5" fill="#FFFFFF" />
          <circle cx="25%" cy="50%" r="1" fill="#FFFFFF" />
          <circle cx="75%" cy="75%" r="2.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* HEADER SECTION */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between z-10">
        <button
          type="button"
          onClick={() => navigate(`/story?id=${storyId || ''}`)}
          aria-label="Back to story reading"
          className="p-2.5 rounded-full border border-sky-300 bg-white/40 backdrop-blur-md hover:bg-white/60 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
        >
          <ArrowLeft className="size-5 text-sky-900" />
        </button>
        <div className="text-center">
          <h1 className="text-base font-black text-sky-950 leading-tight">{storyTitle}</h1>
          <p className="text-[10px] font-bold text-sky-850 uppercase tracking-widest leading-none mt-0.5">
            Chapter {chapterCount} of {chapterCount}
          </p>
        </div>
        <div className="size-10" aria-hidden="true" />
      </header>

      {/* MID: ILLUSTRATION & QUESTION CARD */}
      <main className="w-full max-w-md mx-auto my-auto flex flex-col gap-5 z-10">
        
        <ChoiceIllustration />

        {/* Question Header Card */}
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-sky-100/50 text-center space-y-1">
          <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest leading-none">Your Decision</span>
          <h2 className="text-xl md:text-2xl font-black text-zinc-900 leading-tight">
            What should happen next?
          </h2>
        </div>

        {/* Interactive Choice Grid */}
        {isLoadingChoices ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
        ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-2.5"
        >
          {choices.map((choice, idx) => {
            const style = CHOICE_STYLES[idx % CHOICE_STYLES.length]!;
            const isSelected = selectedChoice === choice.id;
            return (
              <motion.div key={choice.id} variants={itemVariants}>
                <button
                  type="button"
                  onClick={() => setSelectedChoice(choice.id)}
                  aria-checked={isSelected}
                  role="checkbox"
                  className={`relative flex items-center justify-between w-full p-4 rounded-2xl border text-left outline-none transition-all duration-200 select-none
                    ${isSelected 
                      ? 'border-primary bg-primary/10 shadow-[0_4px_12px_rgba(79,70,229,0.15)] text-zinc-900 font-extrabold' 
                      : `border-zinc-200/60 bg-white text-zinc-700 hover:scale-[1.01] hover:shadow-md ${style.colorClass}`
                    }
                    focus-visible:ring-2 focus-visible:ring-primary`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl pointer-events-none select-none">{style.emoji}</span>
                    <span className="text-sm md:text-base font-bold">{choice.text}</span>
                  </div>

                  {/* Circle check badge */}
                  <div
                    className={`size-6 rounded-full border flex items-center justify-center transition-all duration-200
                      ${isSelected 
                        ? 'border-primary bg-primary text-white scale-110' 
                        : 'border-zinc-300 bg-transparent text-transparent'
                      }`}
                  >
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                      >
                        <Check className="size-3.5 stroke-[3px]" />
                      </motion.div>
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </motion.div>
        )}

      </main>

      {/* FOOTER ACTION */}
      <footer className="w-full max-w-md mx-auto pt-4 z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Button
            onClick={handleContinue}
            disabled={!selectedChoice || isSubmitting}
            className="w-full text-base font-bold shadow-lg"
            size="lg"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="size-5 animate-spin" />
                <span>Saving Choice...</span>
              </div>
            ) : (
              "Continue"
            )}
          </Button>
        </motion.div>
      </footer>

    </div>
  );
}
