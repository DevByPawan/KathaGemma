import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center bg-transparent text-white">
      <div className="relative flex flex-col items-center gap-6">
        {/* Glowing Orb */}
        <motion.div
          animate={{ scale: [1, 1.12, 1], rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative size-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_24px_rgba(79,70,229,0.4)]"
        >
          <svg viewBox="0 0 120 120" className="size-10 fill-current text-white" aria-hidden="true">
            <path d="M60 12 L73 45 L108 45 L80 66 L91 99 L60 78 L29 99 L40 66 L12 45 L47 45 Z" />
          </svg>
        </motion.div>

        {/* Loading text with animated bouncing dots */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-black tracking-widest text-zinc-400 uppercase">KathaGemma is thinking</span>
          <div className="flex gap-1 items-center pt-1">
            <span className="size-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="size-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="size-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
