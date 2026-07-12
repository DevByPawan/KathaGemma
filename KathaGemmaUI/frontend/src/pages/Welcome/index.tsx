import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// Playful magical star vector SVG with floating animation
const FloatingStarIllustration = () => (
  <motion.div
    animate={{ y: [0, -12, 0] }}
    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    className="size-48 md:size-56 pointer-events-none select-none"
  >
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      {/* Glow */}
      <circle cx="60" cy="60" r="40" fill="var(--color-primary)" opacity="0.15" className="blur-xl" />
      {/* Star Body */}
      <path
        d="M60 12 L73 45 L108 45 L80 66 L91 99 L60 78 L29 99 L40 66 L12 45 L47 45 Z"
        fill="var(--color-accent)"
        stroke="var(--color-accent)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Cheek glows */}
      <circle cx="48" cy="60" r="3" fill="#EF4444" opacity="0.4" />
      <circle cx="72" cy="60" r="3" fill="#EF4444" opacity="0.4" />
      {/* Eyes */}
      <circle cx="48" cy="54" r="3" fill="#1F2937" />
      <circle cx="72" cy="54" r="3" fill="#1F2937" />
      {/* Smile */}
      <path d="M54 62 Q60 67 66 62" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Sparkles */}
      <circle cx="25" cy="25" r="3" fill="#FFFFFF" opacity="0.8" />
      <circle cx="95" cy="30" r="2" fill="#FFFFFF" opacity="0.8" />
      <circle cx="90" cy="85" r="3" fill="#FFFFFF" opacity="0.8" />
    </svg>
  </motion.div>
);

export default function Welcome() {
  const navigate = useNavigate();

  // Animation variants for child elements cascading up
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans relative overflow-hidden flex flex-col items-center justify-between py-12 px-6">
      
      {/* Ambient background glows */}
      <div className="absolute -left-20 -top-20 -z-10 size-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 -z-10 size-64 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

      {/* Subtle background stars */}
      <div className="absolute inset-0 -z-10 opacity-30 pointer-events-none select-none">
        <svg width="100%" height="100%">
          <circle cx="10%" cy="15%" r="1" fill="#FFFFFF" />
          <circle cx="85%" cy="20%" r="1.5" fill="#FFFFFF" />
          <circle cx="25%" cy="45%" r="1" fill="#FFFFFF" />
          <circle cx="75%" cy="60%" r="2" fill="#FFFFFF" />
          <circle cx="15%" cy="80%" r="1" fill="#FFFFFF" />
          <circle cx="90%" cy="85%" r="1" fill="#FFFFFF" />
        </svg>
      </div>

      {/* TOP: LOGO */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full text-center"
      >
        <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          KathaGemma
        </span>
      </motion.div>

      {/* MIDDLE: ILLUSTRATION & GREETING */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center text-center max-w-sm space-y-6 my-auto"
      >
        {/* Floating character/star illustration */}
        <motion.div variants={itemVariants} className="flex justify-center w-full">
          <FloatingStarIllustration />
        </motion.div>

        {/* Text Content */}
        <div className="space-y-3">
          <motion.h2 
            variants={itemVariants}
            className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-none"
          >
            Hello Friend 👋
          </motion.h2>
          <motion.p 
            variants={itemVariants}
            className="text-zinc-400 text-sm md:text-base font-medium leading-relaxed"
          >
            Ready to explore magical stories together?
          </motion.p>
        </div>
      </motion.div>

      {/* BOTTOM: ACTIONS & BRANDING */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="w-full max-w-xs flex flex-col items-center gap-6"
      >
        <Button
          onClick={() => navigate('/language')}
          className="w-full text-base font-bold shadow-lg"
          size="lg"
        >
          Start Learning
        </Button>

        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-none">
          Powered by Gemma AI
        </span>
      </motion.div>

    </div>
  );
}
