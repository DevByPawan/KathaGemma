import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, ChevronLeft, ChevronRight, Volume2, Loader2, Sparkles } from 'lucide-react';
import { VoiceOrbButton } from '@/components/voice/VoiceOrbButton';
import { getStoryDetails, getChildStories, startNewStory, continueStory } from '@/services/story';
import { sendVoiceMessage } from '@/services/voice';

// Playful story illustration SVG
const StoryIllustration = () => (
  <motion.div
    animate={{ y: [0, -6, 0] }}
    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    className="size-48 md:size-56 pointer-events-none select-none flex items-center justify-center mx-auto"
  >
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      {/* Soft background sky */}
      <circle cx="60" cy="60" r="45" fill="#BAE6FD" />
      {/* Forest Pine Trees */}
      <polygon points="30,75 45,45 60,75" fill="#047857" />
      <polygon points="40,80 55,50 70,80" fill="#065F46" />
      <polygon points="50,75 65,40 80,75" fill="#059669" />
      {/* Little glowing path */}
      <path d="M 50,75 Q 60,65 52,48" fill="none" stroke="#FBBF24" strokeWidth="6" strokeLinecap="round" opacity="0.8" className="blur-xs" />
      {/* Sparky Fox Head */}
      <g transform="translate(68, 62) scale(0.4)">
        <polygon points="50,72 16,36 84,36" fill="#F97316" />
        <polygon points="50,72 16,36 34,36" fill="#FFFFFF" />
        <polygon points="50,72 84,36 66,36" fill="#FFFFFF" />
        <circle cx="50" cy="70" r="4.5" fill="#1F2937" />
        <circle cx="38" cy="44" r="3.5" fill="#1F2937" />
        <circle cx="62" cy="44" r="3.5" fill="#1F2937" />
        <polygon points="20,40 12,18 36,28" fill="#EA580C" />
        <polygon points="80,40 88,18 64,28" fill="#EA580C" />
      </g>
      {/* Magical sparkles */}
      <circle cx="85" cy="30" r="3" fill="#FBBF24" />
      <circle cx="25" cy="35" r="2.5" fill="#FBBF24" />
    </svg>
  </motion.div>
);

// ── Prompt button config ─────────────────────────────────────────────────────

interface PromptButton {
  label: string;
  action: 'next' | 'again' | 'explain' | 'ending';
}

const PROMPT_BUTTONS: PromptButton[] = [
  { label: 'What happens next?', action: 'next' },
  { label: 'Tell it again.', action: 'again' },
  { label: 'Explain this.', action: 'explain' },
  { label: 'Change the ending.', action: 'ending' },
];

export default function Story() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storyId = searchParams.get('id');

  const [sentences, setSentences] = useState<string[]>([]);
  const [storyTitle, setStoryTitle] = useState('Magical Story');
  const [isLoading, setIsLoading] = useState(true);
  const [activeSentence, setActiveSentence] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.75 | 1 | 1.25>(1);

  // Companion reply state (replaces alert)
  const [companionReply, setCompanionReply] = useState<string | null>(null);
  const [isCompanionLoading, setIsCompanionLoading] = useState(false);
  const [activePromptAction, setActivePromptAction] = useState<string | null>(null);

  // Load story details or initialize one
  useEffect(() => {
    const fetchStory = async () => {
      try {
        setIsLoading(true);
        if (storyId) {
          const details = await getStoryDetails(storyId);
          setSentences(details.generatedStory);
          setStoryTitle(details.title);
        } else {
          const stories = await getChildStories();
          if (stories && stories.length > 0) {
            const latest = stories[0];
            if (latest) {
              navigate(`/story?id=${latest.id}`, { replace: true });
            }
          } else {
            const newStory = await startNewStory(
              'Create an adventure about a magic forest with Sparky the Fox',
              localStorage.getItem('katha_language') || 'English'
            );
            navigate(`/story?id=${newStory.storyId}`, { replace: true });
          }
        }
      } catch (error) {
        console.error('Failed to load story:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStory();
  }, [storyId, navigate]);

  // Auto-narration simulation logic: progress index at timing based on speed
  useEffect(() => {
    if (!isPlaying || sentences.length === 0) return;

    // Calculate duration in milliseconds: 4.5s divided by playback speed
    const duration = 4500 / playbackSpeed;

    const timer = setInterval(() => {
      setActiveSentence((prev) => {
        if (prev < sentences.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false); // End of story reached
          return prev;
        }
      });
    }, duration);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, sentences.length]);

  const handlePrev = () => {
    setActiveSentence((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (activeSentence === sentences.length - 1) {
      navigate(`/choice?id=${storyId || ''}`);
    } else {
      setActiveSentence((prev) => Math.min(sentences.length - 1, prev + 1));
    }
  };

  /**
   * Handles the 4 companion prompt buttons with real API calls.
   * No alert() calls — all responses are displayed inline.
   */
  const handlePrompt = async (action: PromptButton['action']) => {
    if (!storyId) return;

    // Clear any previous reply
    setCompanionReply(null);
    setIsCompanionLoading(true);
    setActivePromptAction(action);

    try {
      const language = localStorage.getItem('katha_language') || 'English';
      const currentChapterText = sentences[activeSentence] || sentences[sentences.length - 1] || '';

      switch (action) {
        case 'next': {
          // Continue the story choosing "next chapter" as the choice
          const updated = await continueStory(storyId, 'Continue to the next chapter');
          const newChapters = updated.generatedStory as string[];
          setSentences(newChapters);
          setActiveSentence(newChapters.length - 1);
          setCompanionReply('✨ New chapter added! Keep reading below.');
          break;
        }

        case 'again': {
          // Ask the voice companion to re-narrate the current sentence
          const voiceRes = await sendVoiceMessage(
            `Please re-tell this part of the story in a fun way: "${currentChapterText}"`,
            language,
            storyId
          );
          setCompanionReply(voiceRes.reply);
          break;
        }

        case 'explain': {
          // Ask companion to explain the current chapter in simpler terms
          const voiceRes = await sendVoiceMessage(
            `Explain this in very simple words for a 5-year-old: "${currentChapterText}"`,
            language,
            storyId
          );
          setCompanionReply(voiceRes.reply);
          break;
        }

        case 'ending': {
          // Continue the story with an alternate ending
          const updated = await continueStory(storyId, 'Create a surprising and different ending');
          const newChapters = updated.generatedStory as string[];
          setSentences(newChapters);
          setActiveSentence(newChapters.length - 1);
          setCompanionReply('🎭 Here is a different ending for you!');
          break;
        }
      }
    } catch (error) {
      console.error(`handlePrompt(${action}) failed:`, error);
      setCompanionReply('Oops! Katha is thinking... please try again in a moment.');
    } finally {
      setIsCompanionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-200 flex flex-col items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="mt-4 text-sm font-bold text-sky-950">Gemma is writing a magical tale...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-200 text-zinc-950 font-sans flex flex-col justify-between relative overflow-hidden">
      
      {/* Floating background stars */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-40">
        <svg width="100%" height="100%">
          <circle cx="10%" cy="15%" r="2" fill="#FFFFFF" />
          <circle cx="85%" cy="20%" r="3" fill="#FFFFFF" />
          <circle cx="20%" cy="40%" r="1.5" fill="#FFFFFF" />
          <circle cx="80%" cy="50%" r="2" fill="#FFFFFF" />
        </svg>
      </div>

      {/* HEADER SECTION */}
      <header className="w-full max-w-md mx-auto px-6 pt-6 flex items-center justify-between z-10">
        <button
          type="button"
          onClick={() => navigate('/home')}
          aria-label="Back to home"
          className="p-2.5 rounded-full border border-sky-300 bg-white/40 backdrop-blur-md hover:bg-white/60 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
        >
          <ArrowLeft className="size-5 text-sky-900" />
        </button>
        <div className="text-center">
          <h1 className="text-base font-black text-sky-950 leading-tight">{storyTitle}</h1>
          <p className="text-[10px] font-bold text-sky-850 uppercase tracking-widest leading-none mt-0.5">
            Chapter {activeSentence + 1} of {sentences.length}
          </p>
        </div>
        <div className="size-10" aria-hidden="true" />
      </header>

      {/* MID: IMMERSIVE ILLUSTRATION */}
      <div className="my-auto z-10">
        <StoryIllustration />
      </div>

      {/* STORY CARD OVERLAY */}
      <motion.div
        initial={{ y: "80%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 28 }}
        className="w-full max-w-md mx-auto bg-white rounded-t-[2.5rem] p-6 pb-8 shadow-[0_-10px_30px_rgba(0,0,0,0.12)] flex flex-col gap-6 z-20"
      >
        {/* Narrated Text Area */}
        <div className="space-y-4 min-h-[140px]">
          <div className="flex items-center gap-2 text-primary">
            <Volume2 className="size-5" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Audible Narration</span>
          </div>

          <div className="space-y-2 text-left leading-relaxed">
            {sentences.map((sentence, idx) => {
              const isCurrent = idx === activeSentence;
              return (
                <span
                  key={idx}
                  onClick={() => setActiveSentence(idx)}
                  className={`inline-block mr-1.5 cursor-pointer text-base md:text-lg font-bold rounded-lg transition-all duration-300
                    ${isCurrent 
                      ? 'text-primary bg-primary/10 px-1 py-0.5 scale-102 font-extrabold ring-1 ring-primary/20' 
                      : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                >
                  {sentence}
                </span>
              );
            })}
          </div>
        </div>

        {/* Audio Navigation Controls */}
        <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
          {/* Speed Selector */}
          <div className="flex items-center gap-1 rounded-full border border-zinc-200 p-0.5 bg-zinc-50">
            {([0.75, 1, 1.25] as const).map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => setPlaybackSpeed(speed)}
                className={`text-[10px] font-black rounded-full px-2.5 py-1.5 transition-colors
                  ${playbackSpeed === speed 
                    ? 'bg-primary text-white' 
                    : 'text-zinc-600 hover:bg-zinc-150'
                  }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Primary Skip/Play Triggers */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeSentence === 0}
              aria-label="Previous sentence"
              className="p-2 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 disabled:opacity-40 outline-none select-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronLeft className="size-5 text-zinc-700" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause narration" : "Play narration"}
              className="p-3.5 rounded-full bg-primary text-white shadow-md hover:scale-105 active:scale-95 transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {isPlaying ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current" />}
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next sentence"
              className={`p-2 rounded-full border outline-none select-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-200
                ${activeSentence === sentences.length - 1 
                  ? 'border-primary bg-primary text-white hover:bg-primary/90 hover:scale-105 shadow-md' 
                  : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700'
                }`}
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        {/* VOICE COMPANION ORB AREA */}
        <div className="border-t border-zinc-100 pt-4 flex flex-col items-center gap-4">
          <VoiceOrbButton
            isListening={false}
            onClick={() => navigate(`/voice?id=${storyId || ''}`)}
            label="Talk to Katha"
            className="scale-90"
          />

          {/* Suggested prompts — now wired to real API calls */}
          <div className="w-full">
            <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest text-center mb-2">Suggested questions</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {PROMPT_BUTTONS.map((btn) => (
                <button
                  key={btn.action}
                  type="button"
                  disabled={isCompanionLoading}
                  onClick={() => handlePrompt(btn.action)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all active:scale-95 outline-none disabled:opacity-50 disabled:cursor-not-allowed
                    ${activePromptAction === btn.action && isCompanionLoading
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-zinc-200 bg-zinc-50 hover:bg-primary/5 hover:border-primary hover:text-primary'
                    }`}
                >
                  {activePromptAction === btn.action && isCompanionLoading ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="size-3 animate-spin" />
                      {btn.label}
                    </span>
                  ) : btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Inline companion reply — replaces all alert() calls */}
          <AnimatePresence>
            {companionReply && (
              <motion.div
                key={companionReply}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3"
              >
                <Sparkles className="size-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium text-zinc-700 leading-snug">{companionReply}</p>
                <button
                  type="button"
                  aria-label="Dismiss reply"
                  onClick={() => { setCompanionReply(null); setActivePromptAction(null); }}
                  className="ml-auto text-zinc-400 hover:text-zinc-600 text-lg leading-none flex-shrink-0 outline-none"
                >
                  ×
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>

    </div>
  );
}
