import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Square, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { VoiceOrbButton } from '@/components/voice/VoiceOrbButton';
import { Button } from '@/components/ui/button';
import { sendVoiceMessage } from '@/services/voice';

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export default function Voice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storyId = searchParams.get('id');

  const [currentState, setCurrentState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [speechText, setSpeechText] = useState('');
  const [fullReplyText, setFullReplyText] = useState('');

  // Real browser Speech Recognition with simulation fallback
  useEffect(() => {
    if (currentState !== 'listening') {
      setTranscript('');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Browser SpeechRecognition not supported. Falling back to typing simulator.");
      const script = [
        "Tell me",
        "Tell me a story about Pipo the Panda in a candy forest!"
      ];
      let step = 0;
      const interval = setInterval(() => {
        if (step < script.length) {
          setTranscript(script[step]);
          step++;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setCurrentState('thinking');
          }, 800);
        }
      }, 1200);
      return () => clearInterval(interval);
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      // Trigger API query transition
      setCurrentState('thinking');
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [currentState]);

  // Handle Voice AI query during thinking state
  useEffect(() => {
    if (currentState !== 'thinking') return;

    const callVoiceAPI = async () => {
      try {
        const userTranscript = transcript || "Tell me a story about Pipo the Panda in a candy forest!";
        const language = localStorage.getItem('katha_language') || 'English';
        const response = await sendVoiceMessage(userTranscript, language, storyId || undefined);
        
        setFullReplyText(response.reply);
        setCurrentState('speaking');
      } catch (error) {
        console.error('Failed to get voice reply:', error);
        setFullReplyText('Oh, my magical sensors are a bit busy! Let’s talk again in a moment.');
        setCurrentState('speaking');
      }
    };

    callVoiceAPI();
  }, [currentState, transcript, storyId]);

  // Speaking text typing animation & SpeechSynthesis playback
  useEffect(() => {
    if (currentState !== 'speaking' || !fullReplyText) {
      setSpeechText('');
      window.speechSynthesis.cancel();
      return;
    }

    // Play text-to-speech audio
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(fullReplyText);
    const voices = window.speechSynthesis.getVoices();
    const bestVoice = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) ||
                      voices.find(v => v.lang.startsWith("en"));
    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    window.speechSynthesis.speak(utterance);

    let index = 0;
    const interval = setInterval(() => {
      if (index <= fullReplyText.length) {
        setSpeechText(fullReplyText.substring(0, index));
        index += 2; // Type 2 chars at a time
      } else {
        clearInterval(interval);
      }
    }, 35);

    return () => {
      clearInterval(interval);
      window.speechSynthesis.cancel();
    };
  }, [currentState, fullReplyText]);

  const handleOrbClick = () => {
    if (currentState === 'idle') {
      setCurrentState('listening');
    } else if (currentState === 'listening') {
      setCurrentState('idle');
    }
  };

  const handleStop = () => {
    setCurrentState('idle');
  };

  // Stagger entry configurations
  const fadeVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col justify-between py-8 px-6 relative overflow-hidden">
      
      {/* Background radial glows mapping to current state */}
      <div className="absolute -left-24 -top-24 -z-10 size-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className={`absolute -right-24 -bottom-24 -z-10 size-64 rounded-full blur-3xl pointer-events-none transition-colors duration-1000
        ${currentState === 'listening' ? 'bg-secondary/10' : ''}
        ${currentState === 'thinking' ? 'bg-accent/10' : ''}
        ${currentState === 'speaking' ? 'bg-primary/10' : 'bg-primary/5'}`} 
      />

      {/* Embedded CSS for custom waveform & dot bounce keyframes */}
      <style>{`
        @keyframes wave-bounce {
          0%, 100% { height: 12px; }
          50% { height: 48px; }
        }
        .animate-wave-1 { animation: wave-bounce 0.8s ease-in-out infinite; }
        .animate-wave-2 { animation: wave-bounce 1.1s ease-in-out infinite; animation-delay: 0.2s; }
        .animate-wave-3 { animation: wave-bounce 1.4s ease-in-out infinite; animation-delay: 0.4s; }
        .animate-wave-4 { animation: wave-bounce 0.9s ease-in-out infinite; animation-delay: 0.1s; }
        .animate-wave-5 { animation: wave-bounce 1.2s ease-in-out infinite; animation-delay: 0.3s; }
      `}</style>

      {/* HEADER: Back trigger */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(`/story?id=${storyId || ''}`)}
          aria-label="Back to story reading"
          className="p-2.5 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="size-5 text-zinc-400" />
        </button>
        <span className="text-sm font-extrabold text-zinc-500 uppercase tracking-widest leading-none">Voice Assistant</span>
        <div className="size-10" aria-hidden="true" />
      </header>

      {/* MAIN VIEW: Interactive States */}
      <main className="w-full max-w-md mx-auto my-auto flex flex-col items-center justify-center gap-10">
        
        {/* Dynamic Context Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-none">
            {currentState === 'idle' && "Talk to Katha"}
            {currentState === 'listening' && "Listening..."}
            {currentState === 'thinking' && "Thinking..."}
            {currentState === 'speaking' && "Speaking..."}
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm font-semibold">
            {currentState === 'idle' && "Speak and let your imagination come alive"}
            {currentState === 'listening' && "Tell me anything you want!"}
            {currentState === 'thinking' && "Gemma is cooking up a magical story..."}
            {currentState === 'speaking' && "Listen to Sparky's new adventure"}
          </p>
        </div>

        {/* Central Orb & Visual Animations */}
        <div className="relative flex items-center justify-center min-h-[160px]">
          <AnimatePresence mode="wait">
            {currentState === 'idle' && (
              <motion.div key="idle" variants={fadeVariants} initial="initial" animate="animate" exit="exit">
                <VoiceOrbButton
                  isListening={false}
                  onClick={handleOrbClick}
                  label="Tap to talk"
                />
              </motion.div>
            )}

            {currentState === 'listening' && (
              <motion.div key="listening" variants={fadeVariants} initial="initial" animate="animate" exit="exit">
                <VoiceOrbButton
                  isListening={true}
                  onClick={handleOrbClick}
                  label="Stop listening"
                />
              </motion.div>
            )}

            {currentState === 'thinking' && (
              <motion.div
                key="thinking"
                variants={fadeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center gap-6"
              >
                {/* Accent Color Glowing Orb */}
                <div className="relative size-28 md:size-32 rounded-full border-4 border-accent bg-accent text-zinc-950 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.4)] animate-pulse">
                  <Sparkles className="size-10 md:size-12 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                {/* 3 Bouncing Dots */}
                <div className="flex gap-2 items-center">
                  <span className="size-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="size-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="size-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}

            {currentState === 'speaking' && (
              <motion.div
                key="speaking"
                variants={fadeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center gap-6"
              >
                {/* Voice Waveform animation */}
                <div className="flex items-end justify-center gap-2 h-16 px-8 pointer-events-none">
                  <span className="w-1.5 bg-secondary rounded-full animate-wave-1" />
                  <span className="w-1.5 bg-primary rounded-full animate-wave-2" />
                  <span className="w-1.5 bg-secondary rounded-full animate-wave-3" />
                  <span className="w-1.5 bg-primary rounded-full animate-wave-4" />
                  <span className="w-1.5 bg-secondary rounded-full animate-wave-5" />
                </div>
                {/* Micro stop icon trigger */}
                <button
                  type="button"
                  onClick={handleStop}
                  aria-label="Stop playback"
                  className="p-3.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 active:scale-95 transition-all outline-none"
                >
                  <Square className="size-5 fill-current" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM CONTENT: Live Transcript / Speech Output */}
        <div className="w-full min-h-[140px] px-2">
          <AnimatePresence mode="wait">
            {currentState === 'listening' && (
              <motion.div
                key="listening-transcript"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center"
              >
                <span className="text-[10px] font-extrabold uppercase text-zinc-500 tracking-widest">Your Transcript</span>
                <p className="mt-1.5 text-base font-bold text-white leading-relaxed italic">
                  {transcript || "Start talking..."}
                </p>
              </motion.div>
            )}

            {currentState === 'speaking' && (
              <motion.div
                key="speaking-text"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4"
              >
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-secondary tracking-widest">Katha Response</span>
                  <p className="mt-2 text-base font-bold text-zinc-200 leading-relaxed text-left">
                    {speechText}
                    <span className="inline-block size-2 bg-secondary rounded-full animate-ping ml-1" />
                  </p>
                </div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="pt-2"
                >
                  <Button
                    onClick={() => navigate(`/story?id=${storyId || ''}`)}
                    className="w-full shadow-md text-sm font-bold"
                  >
                    Choose What Happens Next
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {currentState === 'idle' && (
              <motion.div
                key="idle-suggestions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full space-y-3"
              >
                <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest text-center">Suggested prompts</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "Make up a funny tale",
                    "Tell a bedtime story",
                    "Start a jungle adventure",
                    "Explore outer space!"
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setCurrentState('listening');
                        setTimeout(() => setTranscript(suggestion), 300);
                      }}
                      className="text-xs font-semibold px-3.5 py-2 rounded-full border border-zinc-900 bg-zinc-900/40 hover:bg-primary/5 hover:border-primary hover:text-primary transition-all active:scale-95 outline-none"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

      {/* FOOTER: Stop Action (only when not idle) */}
      <footer className="w-full max-w-md mx-auto pt-6 flex justify-center">
        {currentState !== 'idle' && (
          <Button
            onClick={() => navigate(`/story?id=${storyId || ''}`)}
            variant="outline"
            className="w-full text-base font-bold shadow-md"
            size="lg"
          >
            Cancel Interaction
          </Button>
        )}
      </footer>

    </div>
  );
}
