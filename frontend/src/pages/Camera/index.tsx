import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera as CameraIcon, RotateCcw, Check, ArrowLeft, Loader2, Trophy, Zap, AlertCircle } from 'lucide-react';
import { getCameraMission, analyzePhoto, type CameraMission } from '@/services/camera';

type ScreenState = 'loading' | 'permission_denied' | 'no_mission' | 'active_stream' | 'preview_captured' | 'analyzing' | 'success' | 'failure';

export default function Camera() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // State variables
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [mission, setMission] = useState<CameraMission | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    matched: boolean;
    confidence: number;
    rewardXP: number;
    badge: string | null;
    explanation: string;
  } | null>(null);

  // Helper to map localStorage language codes to backend strings
  const getLanguageString = (code: string | null) => {
    if (code === 'hi') return 'हिन्दी';
    if (code === 'bn') return 'Bengali';
    return 'English';
  };

  // Load mission and request camera
  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const lang = localStorage.getItem('katha_language') || 'en';
        const mappedLang = getLanguageString(lang);
        const activeMission = await getCameraMission(mappedLang);
        
        if (!activeMission || !activeMission.targetObject) {
          if (active) setScreenState('no_mission');
          return;
        }

        if (active) {
          setMission(activeMission);
          await startCamera();
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (active) setScreenState('no_mission');
      }
    };

    init();

    return () => {
      active = false;
      stopCamera();
    };
  }, []);

  // Request & Start camera stream
  const startCamera = async () => {
    try {
      setScreenState('loading');
      stopCamera(); // Make sure previous stream is cleared

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      setStream(mediaStream);
      setScreenState('active_stream');
    } catch (err) {
      console.error('Camera access error:', err);
      setScreenState('permission_denied');
    }
  };

  // Stop camera tracks
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Capture frame to canvas
  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get base64 Data URL
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
    setScreenState('preview_captured');

    // Turn off camera stream to save resources
    stopCamera();
  };

  // Retake photo
  const handleRetake = async () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    await startCamera();
  };

  // Send photo to backend for validation
  const handleVerify = async () => {
    if (!mission || !capturedImage) return;

    try {
      setScreenState('analyzing');
      const response = await analyzePhoto(mission.targetObject, capturedImage);

      setAnalysisResult({
        matched: response.matched,
        confidence: response.confidence,
        rewardXP: response.rewardXP,
        badge: response.badge,
        explanation: (response as any).explanation || 'Completed scanning operation!',
      });

      if (response.matched) {
        setScreenState('success');
      } else {
        setScreenState('failure');
      }
    } catch (err) {
      console.error('Validation error:', err);
      setErrorMessage('Could not verify photo. Please verify backend connectivity!');
      setScreenState('failure');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans flex flex-col justify-between py-6 px-4 relative overflow-hidden">
      
      {/* Background radial blobs */}
      <div className="absolute -left-20 -top-20 -z-10 size-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 -z-10 size-64 rounded-full bg-secondary/5 blur-3xl pointer-events-none" />

      {/* Header section */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between z-10">
        <button
          type="button"
          onClick={() => {
            stopCamera();
            navigate('/home');
          }}
          aria-label="Back to home"
          className="p-2.5 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 active:scale-95 transition-all outline-none"
        >
          <ArrowLeft className="size-5 text-zinc-400" />
        </button>
        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest leading-none">
          {mission?.title || 'Camera Mission'}
        </span>
        <div className="size-10" />
      </header>

      {/* Main Viewport Container */}
      <main className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center my-6 z-10">
        
        {/* Quest Instruction banner */}
        {mission && (screenState === 'active_stream' || screenState === 'preview_captured') && (
          <div className="mb-4 text-center space-y-1">
            <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-orange-500/15 border border-orange-500/30 text-orange-400 px-3 py-1 rounded-full">
              Target: {mission.targetObject}
            </span>
            <p className="text-sm font-semibold text-zinc-300 px-4">{mission.instruction}</p>
          </div>
        )}

        <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900/40 flex flex-col items-center justify-center shadow-lg">
          
          <AnimatePresence mode="wait">
            
            {/* Loading state */}
            {screenState === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <Loader2 className="size-8 text-primary animate-spin" />
                <span className="text-xs text-zinc-500 font-semibold">Starting camera...</span>
              </motion.div>
            )}

            {/* Permission Denied state */}
            {screenState === 'permission_denied' && (
              <motion.div
                key="permission"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center p-6 space-y-4"
              >
                <div className="size-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertCircle className="size-6 text-red-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">Camera Access Required</h3>
                  <p className="text-xs text-zinc-500 max-w-xs font-semibold">
                    We need camera permission to search for targets. Please check your browser settings and try again.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="py-2 px-5 bg-primary text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-600 active:scale-95 transition-all cursor-pointer"
                >
                  Try Again
                </button>
              </motion.div>
            )}

            {/* No Mission state */}
            {screenState === 'no_mission' && (
              <motion.div
                key="no_mission"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center p-6 space-y-3"
              >
                <div className="size-12 rounded-full bg-zinc-800 flex items-center justify-center">
                  <CameraIcon className="size-6 text-zinc-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">No Mission Available</h3>
                  <p className="text-xs text-zinc-500 max-w-xs font-semibold">
                    Katha doesn't have an exploration mission for you right now. Let's try again in a little bit!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/home')}
                  className="py-2 px-5 bg-zinc-800 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer"
                >
                  Go Back Home
                </button>
              </motion.div>
            )}

            {/* Live streaming preview */}
            {screenState === 'active_stream' && (
              <motion.video
                key="stream"
                ref={(el) => {
                  videoRef.current = el;
                  if (el && stream && el.srcObject !== stream) {
                    el.srcObject = stream;
                    el.play().catch((err) => console.error('Error playing stream:', err));
                  }
                }}
                autoPlay
                playsInline
                muted
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full object-cover"
              />
            )}

            {/* Captured preview confirmation */}
            {screenState === 'preview_captured' && capturedImage && (
              <motion.img
                key="preview"
                src={capturedImage}
                alt="Captured target snapshot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full object-cover"
              />
            )}

            {/* Analyzing state */}
            {screenState === 'analyzing' && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center gap-4 px-6"
              >
                {/* Bouncing star animation */}
                <div className="relative size-16">
                  <motion.div
                    className="absolute inset-0 text-amber-400 text-5xl flex items-center justify-center font-bold"
                    animate={{ y: [0, -12, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    ⭐
                  </motion.div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">Analyzing Photo...</h3>
                  <p className="text-xs text-zinc-500 font-semibold">Katha is matching your target. Please wait!</p>
                </div>
              </motion.div>
            )}

            {/* Success screen */}
            {screenState === 'success' && analysisResult && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center p-6 space-y-4"
              >
                <div className="size-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center relative">
                  {/* Confetti decoration particles */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-1 -right-1 text-base"
                  >
                    🎉
                  </motion.div>
                  <Check className="size-8 text-green-400" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-white leading-none">Mission Complete!</h3>
                  <p className="text-xs text-zinc-400 font-semibold px-4 mt-1 leading-snug">
                    {analysisResult.explanation}
                  </p>
                </div>

                {/* Rewards Grid */}
                <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs pt-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-left">
                    <Zap className="size-4.5 text-amber-400 fill-amber-400" />
                    <div>
                      <p className="text-xs font-black text-amber-400 leading-none">+{analysisResult.rewardXP} XP</p>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-none mt-0.5">Awarded</p>
                    </div>
                  </div>

                  {analysisResult.badge && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 text-left">
                      <Trophy className="size-4.5 text-purple-400 fill-purple-400" />
                      <div>
                        <p className="text-[10px] font-black text-purple-300 leading-none truncate max-w-[80px]">
                          {analysisResult.badge}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-none mt-0.5">Unlocked</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Failure/Mismatch screen */}
            {screenState === 'failure' && analysisResult && (
              <motion.div
                key="failure"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center p-6 space-y-4"
              >
                <div className="size-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <RotateCcw className="size-8 text-red-400" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-white leading-none">Target Not Spotted</h3>
                  <p className="text-xs text-zinc-400 font-semibold px-4 mt-1 leading-snug">
                    {errorMessage || analysisResult.explanation}
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </main>

      {/* Control Buttons Footer */}
      <footer className="w-full max-w-md mx-auto pt-4 z-10">
        
        {/* Active camera view footer */}
        {screenState === 'active_stream' && (
          <div className="flex justify-center">
            <motion.button
              type="button"
              onClick={handleCapture}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className="size-16 rounded-full bg-gradient-to-r from-primary to-indigo-500 flex items-center justify-center shadow-lg border border-white/20 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
              aria-label="Capture photograph"
            >
              <CameraIcon className="size-7 text-white" />
            </motion.button>
          </div>
        )}

        {/* Capture preview verification footer */}
        {screenState === 'preview_captured' && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white text-xs font-black uppercase tracking-wider transition-all active:scale-98 cursor-pointer"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={handleVerify}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-98 cursor-pointer"
            >
              Verify with Katha
            </button>
          </div>
        )}

        {/* Success complete redirect footer */}
        {screenState === 'success' && (
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-98 cursor-pointer"
          >
            Return to Home
          </button>
        )}

        {/* Failure retry footer */}
        {screenState === 'failure' && (
          <button
            type="button"
            onClick={handleRetake}
            className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-98 cursor-pointer"
          >
            Try Again
          </button>
        )}

      </footer>

    </div>
  );
}
