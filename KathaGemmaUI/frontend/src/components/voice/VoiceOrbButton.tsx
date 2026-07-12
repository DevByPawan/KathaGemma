import { Mic } from 'lucide-react';

interface VoiceOrbButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function VoiceOrbButton({
  isListening,
  onClick,
  disabled = false,
  label = "Tap to talk",
  className = '',
}: VoiceOrbButtonProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Inline styles for self-contained, hardware-accelerated ripple animations */}
      <style>{`
        @keyframes orb-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes orb-ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .animate-orb-pulse {
          animation: orb-pulse 2s ease-in-out infinite;
        }
        .animate-orb-ripple-1 {
          animation: orb-ripple 2.5s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
        }
        .animate-orb-ripple-2 {
          animation: orb-ripple 2.5s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
          animation-delay: 0.8s;
        }
        .animate-orb-ripple-3 {
          animation: orb-ripple 2.5s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
          animation-delay: 1.6s;
        }
      `}</style>

      <div className="relative flex items-center justify-center">
        {/* Animated Ripple Rings (only visible when listening) */}
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-full bg-primary/20 pointer-events-none animate-orb-ripple-1" />
            <div className="absolute inset-0 rounded-full bg-secondary/15 pointer-events-none animate-orb-ripple-2" />
            <div className="absolute inset-0 rounded-full bg-accent/10 pointer-events-none animate-orb-ripple-3" />
          </>
        )}

        {/* Central Orb Button */}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={isListening}
          aria-label={isListening ? "Stop listening" : "Start voice input"}
          className={`relative z-10 flex size-28 md:size-32 items-center justify-center rounded-full border-4 shadow-xl outline-none select-none transition-all duration-300
            ${isListening 
              ? 'border-secondary bg-secondary text-secondary-foreground shadow-[0_0_30px_rgba(20,184,166,0.5)] animate-orb-pulse' 
              : 'border-primary/20 bg-primary text-primary-foreground hover:scale-105 active:scale-95 hover:shadow-[0_8px_24px_rgba(79,70,229,0.4)]'
            } 
            disabled:pointer-events-none disabled:opacity-40
            focus-visible:ring-4 focus-visible:ring-primary/40`}
        >
          {isListening ? (
            <Mic className="size-10 md:size-12 animate-pulse" />
          ) : (
            <Mic className="size-10 md:size-12" />
          )}
        </button>
      </div>

      {/* Helper instruction text */}
      {label && (
        <span 
          aria-hidden="true"
          className={`text-sm font-semibold tracking-wide uppercase transition-colors duration-300
            ${isListening ? 'text-secondary animate-pulse' : 'text-zinc-400'}`}
        >
          {isListening ? "Listening..." : label}
        </span>
      )}
    </div>
  );
}
