import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface LanguageCardProps {
  language: string;
  nativeName: string;
  selected: boolean;
  onClick: () => void;
  flag?: string;
  className?: string;
}

export function LanguageCard({
  language,
  nativeName,
  selected,
  onClick,
  flag,
  className = '',
}: LanguageCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-checked={selected}
      role="checkbox"
      className={`relative flex items-center justify-between w-full p-5 rounded-2xl border text-left outline-none transition-all duration-200 select-none
        ${selected 
          ? 'border-primary bg-primary/10 shadow-[0_4px_12px_rgba(79,70,229,0.15)] text-white' 
          : 'border-border bg-card text-zinc-300 hover:border-zinc-700 hover:text-white'
        }
        focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    >
      <div className="flex items-center gap-4">
        {flag && (
          <span 
            role="img" 
            aria-label={`${language} flag`}
            className="text-3xl pointer-events-none select-none"
          >
            {flag}
          </span>
        )}
        <div className="space-y-1">
          <p className="font-bold text-base md:text-lg leading-none">{language}</p>
          <p className="text-xs md:text-sm text-zinc-400 font-medium">{nativeName}</p>
        </div>
      </div>

      {/* Check Indicator using Motion */}
      <div className="flex items-center justify-center">
        <div
          className={`size-6 rounded-full border flex items-center justify-center transition-all duration-200
            ${selected 
              ? 'border-primary bg-primary text-white scale-110' 
              : 'border-zinc-700 bg-transparent text-transparent'
            }`}
        >
          {selected && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Check className="size-3.5 stroke-[3px]" />
            </motion.div>
          )}
        </div>
      </div>
    </button>
  );
}
