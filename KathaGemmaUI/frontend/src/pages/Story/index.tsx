import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, ChevronLeft, ChevronRight, Volume2, Loader2, Sparkles, Camera } from 'lucide-react';
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

const CHOICE_STYLES = [
  { emoji: '🦊', colorClass: 'border-orange-500/20 hover:border-orange-500 bg-orange-500/5' },
  { emoji: '🌳', colorClass: 'border-emerald-500/20 hover:border-emerald-500 bg-emerald-500/5' },
  { emoji: '🐦', colorClass: 'border-blue-500/20 hover:border-blue-500 bg-blue-500/5' },
  { emoji: '🏡', colorClass: 'border-rose-500/20 hover:border-rose-500 bg-rose-500/5' },
  { emoji: '⭐', colorClass: 'border-yellow-500/20 hover:border-yellow-500 bg-yellow-500/5' },
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

  // Companion voice prompts reply state
  const [companionReply, setCompanionReply] = useState<string | null>(null);
  const [isCompanionLoading, setIsCompanionLoading] = useState(false);
  const [activePromptAction, setActivePromptAction] = useState<string | null>(null);

  // Choice progression states
  const [choices, setChoices] = useState<Array<{ id: string; text: string }>>([]);
  const [storyStatus, setStoryStatus] = useState<'STARTED' | 'COMPLETED'>('STARTED');
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [expectedInput, setExpectedInput] = useState<string | null>(null);

  // Load story details or initialize one
  useEffect(() => {
    const fetchStory = async () => {
      try {
        setIsLoading(true);
        if (storyId) {
          const details = await getStoryDetails(storyId);
          setSentences(details.generatedStory);
          setStoryTitle(details.title);
          setChoices(details.choices || []);
          setStoryStatus((details.status || 'STARTED') as 'STARTED' | 'COMPLETED');
          setExpectedInput(details.expectedInput || null);
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

  // Actual SpeechSynthesis Text-to-Speech playback loop
  useEffect(() => {
    if (!isPlaying || sentences.length === 0) {
      window.speechSynthesis.cancel();
      return;
    }

    window.speechSynthesis.cancel(); // Reset active audio cues
    const textToSpeak = sentences[activeSentence];
    if (textToSpeak) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = playbackSpeed;
      
      const voices = window.speechSynthesis.getVoices();
      // Prioritize natural or UK English voices for warm narration tone
      const bestVoice = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) ||
                        voices.find(v => v.lang.startsWith("en"));
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      utterance.onend = () => {
        if (activeSentence < sentences.length - 1) {
          setActiveSentence((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      };

      utterance.onerror = (e) => {
        console.warn("SpeechSynthesis error:", e);
        // Fallback timer progression if speech fails/is blocked
        const fallback = setTimeout(() => {
          if (activeSentence < sentences.length - 1) {
            setActiveSentence((prev) => prev + 1);
          } else {
            setIsPlaying(false);
          }
        }, 4000);
        return () => clearTimeout(fallback);
      };

      window.speechSynthesis.speak(utterance);
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isPlaying, activeSentence, sentences, playbackSpeed]);

  const handlePrev = () => {
    setActiveSentence((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (activeSentence === sentences.length - 1) {
      if (storyStatus === 'COMPLETED') {
        navigate(`/celebration?id=${storyId || ''}`);
      }
    } else {
      setActiveSentence((prev) => Math.min(sentences.length - 1, prev + 1));
    }
  };

  const handleChoiceSelection = async (choiceText: string) => {
    if (!storyId || isGeneratingNext) return;

    try {
      setIsGeneratingNext(true);
      setCompanionReply(null);
      
      const updated = await continueStory(storyId, choiceText);
      const newChapters = updated.generatedStory as string[];
      
      setSentences(newChapters);
      setChoices(updated.choices || []);
      setStoryStatus((updated.status || 'STARTED') as 'STARTED' | 'COMPLETED');
      setExpectedInput(updated.expectedInput || null);
      
      // Instantly position active view to the new chapter text page
      setActiveSentence(newChapters.length - 1);
    } catch (err) {
      console.error('Failed to submit choice:', err);
    } finally {
      setIsGeneratingNext(false);
    }
  };

  const handlePrompt = async (action: PromptButton['action']) => {
    if (!storyId) return;

    setCompanionReply(null);
    setIsCompanionLoading(true);
    setActivePromptAction(action);

    try {
      const language = localStorage.getItem('katha_language') || 'English';
      const currentChapterText = sentences[activeSentence] || sentences[sentences.length - 1] || '';

      switch (action) {
        case 'next': {
          // If we have dynamic choices, select the first choice option automatically as a nudge!
          if (choices.length > 0 && choices[0]) {
            await handleChoiceSelection(choices[0].text);
            setCompanionReply('✨ Choice selected! Writing continuation...');
          } else {
            const updated = await continueStory(storyId, 'Continue to the next chapter');
            const newChapters = updated.generatedStory as string[];
            setSentences(newChapters);
            setChoices(updated.choices || []);
            setStoryStatus((updated.status || 'STARTED') as 'STARTED' | 'COMPLETED');
            setActiveSentence(newChapters.length - 1);
            setCompanionReply('✨ New chapter added!');
          }
          break;
        }

        case 'again': {
          const voiceRes = await sendVoiceMessage(
            `Please re-tell this part of the story in a fun way: "${currentChapterText}"`,
            language,
            storyId
          );
          setCompanionReply(voiceRes.reply);
          break;
        }

        case 'explain': {
          const voiceRes = await sendVoiceMessage(
            `Explain this in very simple words for a 5-year-old: "${currentChapterText}"`,
            language,
            storyId
          );
          setCompanionReply(voiceRes.reply);
          break;
        }

        case 'ending': {
          const updated = await continueStory(storyId, 'Create a surprising and different ending');
          const newChapters = updated.generatedStory as string[];
          setSentences(newChapters);
          setChoices(updated.choices || []);
          setStoryStatus((updated.status || 'STARTED') as 'STARTED' | 'COMPLETED');
          setActiveSentence(newChapters.length - 1);
          setCompanionReply('🎭 Different ending prepared!');
          break;
        }
      }
    } catch (error) {
      console.error(`handlePrompt(${action}) failed:`, error);
      setCompanionReply('Oops! Sparky is thinking... please try again!');
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

  const isLatestChapter = activeSentence === sentences.length - 1;

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
        className="w-full max-w-md mx-auto bg-white rounded-t-[2.5rem] p-5 pb-6 shadow-[0_-10px_30px_rgba(0,0,0,0.12)] flex flex-col gap-4 z-20 overflow-y-auto max-h-[85vh]"
      >
        {/* Narrated Text Area */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Volume2 className="size-4.5" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Audible Narration</span>
          </div>

          <div className="space-y-2 text-left leading-relaxed max-h-[120px] overflow-y-auto pr-1 scroll-smooth">
            {sentences.map((sentence, idx) => {
              const isCurrent = idx === activeSentence;
              return (
                <span
                  key={idx}
                  onClick={() => setActiveSentence(idx)}
                  className={`inline-block mr-1.5 cursor-pointer text-base md:text-lg font-bold rounded-lg transition-all duration-300
                    ${isCurrent 
                      ? 'text-primary bg-primary/10 px-1.5 py-0.5 scale-102 font-extrabold ring-1 ring-primary/20' 
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

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeSentence === 0}
              aria-label="Previous chapter"
              className="p-2 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 disabled:opacity-40 outline-none select-none"
            >
              <ChevronLeft className="size-5 text-zinc-700" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause narration" : "Play narration"}
              className="p-3.5 rounded-full bg-primary text-white shadow-md hover:scale-105 active:scale-95 transition-all outline-none"
            >
              {isPlaying ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current" />}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={activeSentence === sentences.length - 1 && storyStatus !== 'COMPLETED'}
              aria-label="Next chapter"
              className={`p-2 rounded-full border outline-none select-none transition-all duration-200
                ${activeSentence === sentences.length - 1 && storyStatus === 'COMPLETED'
                  ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105 shadow-md' 
                  : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 disabled:opacity-30'
                }`}
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        {/* ── DYNAMIC INLINE CHOICES AREA ── */}
        {isLatestChapter && (
          <div className="border-t border-zinc-100 pt-4 space-y-3">
            {expectedInput === 'image' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3 shadow-inner"
              >
                <div className="flex items-center gap-2 text-amber-800">
                  <Camera className="size-5 animate-bounce" />
                  <span className="text-xs font-black uppercase tracking-wider">Active Recovery Quest!</span>
                </div>
                <p className="text-xs text-amber-700 font-bold leading-relaxed">
                  Aarav, let's play a small game to help you focus! Tap the button below to open your camera and scan the object.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/camera?id=${storyId || ''}`)}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="size-4.5" />
                  <span>Open Magic Camera</span>
                </button>
              </motion.div>
            )}

            {storyStatus === 'COMPLETED' ? (
              <div className="space-y-3">
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-100 text-center text-sm font-bold flex flex-col items-center justify-center gap-1">
                  <span>🎉 The story has reached a beautiful ending!</span>
                  <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Completed all 5 chapters</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/celebration?id=${storyId || ''}`)}
                  className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-base rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Finish Book & Celebrate</span>
                  <Sparkles className="size-5 animate-pulse" />
                </button>
              </div>
            ) : isGeneratingNext ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-center text-primary">
                <Loader2 className="size-8 animate-spin text-primary" />
                <span className="text-xs font-black uppercase tracking-widest animate-pulse">Katha is writing the next chapter...</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest text-center">What should happen next?</p>
                <div className="grid grid-cols-1 gap-2.5">
                  {choices.map((choice, idx) => {
                    const style = CHOICE_STYLES[idx % CHOICE_STYLES.length]!;
                    return (
                      <button
                        key={choice.id || idx}
                        type="button"
                        disabled={isGeneratingNext}
                        onClick={() => handleChoiceSelection(choice.text)}
                        className={`flex items-center gap-3.5 p-4 rounded-2xl border text-left outline-none transition-all active:scale-98 select-none border-zinc-200/60 bg-white hover:shadow-md text-zinc-700 hover:border-primary hover:text-primary ${style.colorClass} cursor-pointer`}
                      >
                        <span className="text-2xl pointer-events-none select-none">{style.emoji}</span>
                        <span className="text-sm font-bold">{choice.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VOICE COMPANION ORB AREA */}
        <div className="border-t border-zinc-100 pt-4 flex flex-col items-center gap-4">
          <VoiceOrbButton
            isListening={false}
            onClick={() => navigate(`/voice?id=${storyId || ''}`)}
            label="Talk to Katha"
            className="scale-90"
          />

          <div className="w-full">
            <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest text-center mb-2">Suggested questions</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {PROMPT_BUTTONS.map((btn) => (
                <button
                  key={btn.action}
                  type="button"
                  disabled={isCompanionLoading || isGeneratingNext}
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
