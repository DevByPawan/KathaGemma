import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export type AvatarType = 'panda' | 'elephant' | 'fox' | 'parrot';

interface AvatarCardProps {
  name: string;
  avatarType: AvatarType;
  selected: boolean;
  onClick: () => void;
  className?: string;
}

// Custom inline SVGs for the welcome animal buddies
const AvatarIllustration: React.FC<{ type: AvatarType; className?: string }> = ({ type, className = '' }) => {
  switch (type) {
    case 'panda':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} aria-hidden="true">
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="#E2E8F0" />
          {/* Ears */}
          <circle cx="26" cy="28" r="11" fill="#1F2937" />
          <circle cx="74" cy="28" r="11" fill="#1F2937" />
          {/* Head */}
          <circle cx="50" cy="52" r="30" fill="#FFFFFF" />
          <path d="M50 22 C26 22 20 35 20 52 C20 69 26 82 50 82 C74 82 80 69 80 52 C80 35 74 22 50 22 Z" fill="#FFFFFF" />
          {/* Eye patches */}
          <ellipse cx="38" cy="48" rx="8" ry="11" transform="rotate(-15 38 48)" fill="#1F2937" />
          <ellipse cx="62" cy="48" rx="8" ry="11" transform="rotate(15 62 48)" fill="#1F2937" />
          {/* Eyes */}
          <circle cx="38" cy="46" r="3.5" fill="#FFFFFF" />
          <circle cx="38" cy="46" r="1.5" fill="#111827" />
          <circle cx="62" cy="46" r="3.5" fill="#FFFFFF" />
          <circle cx="62" cy="46" r="1.5" fill="#111827" />
          {/* Nose */}
          <polygon points="46,56 54,56 50,60" fill="#1F2937" />
          {/* Smile */}
          <path d="M44,63 Q50,67 56,63" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'elephant':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} aria-hidden="true">
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="#F3E8FF" />
          {/* Ears */}
          <ellipse cx="24" cy="46" rx="18" ry="24" fill="#C084FC" />
          <ellipse cx="24" cy="46" rx="12" ry="17" fill="#E879F9" />
          <ellipse cx="76" cy="46" rx="18" ry="24" fill="#C084FC" />
          <ellipse cx="76" cy="46" rx="12" ry="17" fill="#E879F9" />
          {/* Body/Head */}
          <circle cx="50" cy="50" r="28" fill="#A855F7" />
          {/* Eyes */}
          <circle cx="41" cy="45" r="3.5" fill="#1F2937" />
          <circle cx="59" cy="45" r="3.5" fill="#1F2937" />
          <ellipse cx="41" cy="43" rx="1" ry="1.5" fill="#FFFFFF" />
          <ellipse cx="59" cy="43" rx="1" ry="1.5" fill="#FFFFFF" />
          {/* Cheeks */}
          <circle cx="35" cy="52" r="3" fill="#F472B6" opacity="0.6" />
          <circle cx="65" cy="52" r="3" fill="#F472B6" opacity="0.6" />
          {/* Trunk */}
          <path d="M 50,53 Q 50,75 62,72" fill="none" stroke="#A855F7" strokeWidth="10" strokeLinecap="round" />
          <path d="M 50,53 Q 50,75 62,72" fill="none" stroke="#8B5CF6" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
        </svg>
      );
    case 'fox':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} aria-hidden="true">
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="#FFEDD5" />
          {/* Ears */}
          <polygon points="20,40 12,18 36,28" fill="#EA580C" />
          <polygon points="22,38 17,23 32,29" fill="#FFEDD5" />
          <polygon points="80,40 88,18 64,28" fill="#EA580C" />
          <polygon points="78,38 83,23 68,29" fill="#FFEDD5" />
          {/* Head */}
          <polygon points="50,72 16,36 84,36" fill="#F97316" />
          {/* Cheeks */}
          <polygon points="50,72 16,36 34,36" fill="#FFFFFF" />
          <polygon points="50,72 84,36 66,36" fill="#FFFFFF" />
          {/* Nose */}
          <circle cx="50" cy="70" r="4.5" fill="#1F2937" />
          {/* Eyes */}
          <circle cx="38" cy="44" r="3.5" fill="#1F2937" />
          <circle cx="62" cy="44" r="3.5" fill="#1F2937" />
          <circle cx="39" cy="42" r="1" fill="#FFFFFF" />
          <circle cx="63" cy="42" r="1" fill="#FFFFFF" />
        </svg>
      );
    case 'parrot':
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} aria-hidden="true">
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="#ECFDF5" />
          {/* Crest */}
          <path d="M 50,15 C 45,5 35,10 32,15 C 38,20 45,22 50,22 Z" fill="#EF4444" />
          <path d="M 54,16 C 50,8 42,12 40,16 C 45,20 50,22 54,22 Z" fill="#FBBF24" />
          {/* Body/Head */}
          <path d="M 28,52 C 28,30 50,22 62,35 C 72,46 72,70 60,82 C 48,88 28,75 28,52 Z" fill="#EF4444" />
          {/* Wing */}
          <path d="M 28,56 C 24,70 38,80 44,78 C 42,70 36,60 28,56 Z" fill="#10B981" />
          {/* Cheek mask */}
          <ellipse cx="58" cy="48" rx="14" ry="11" fill="#FFFFFF" />
          {/* Eye */}
          <circle cx="58" cy="46" r="5.5" fill="#111827" />
          <circle cx="56" cy="44" r="1.5" fill="#FFFFFF" />
          {/* Beak */}
          <path d="M 68,43 C 78,43 82,50 82,58 C 76,58 72,50 68,48 Z" fill="#F59E0B" />
          {/* Yellow collar */}
          <path d="M 38,62 Q 50,68 62,56" stroke="#FBBF24" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
};

export function AvatarCard({
  name,
  avatarType,
  selected,
  onClick,
  className = '',
}: AvatarCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-checked={selected}
      role="checkbox"
      className="group flex flex-col items-center gap-3 outline-none select-none"
    >
      <div className={`relative flex size-24 md:size-28 items-center justify-center rounded-3xl p-1.5 border-3 transition-all duration-300
        ${selected 
          ? 'border-primary bg-primary/10 shadow-[0_8px_20px_rgba(79,70,229,0.25)] scale-105' 
          : 'border-border bg-card hover:border-zinc-700 hover:scale-102 hover:shadow-md'
        }
        focus-visible:ring-4 focus-visible:ring-primary/40 ${className}`}
      >
        <AvatarIllustration type={avatarType} className="rounded-2xl transition-transform duration-300 group-hover:scale-105" />

        {/* Selected badge overlay */}
        {selected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
            className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-primary border-2 border-zinc-950 text-white shadow-md"
          >
            <Check className="size-4 stroke-[3px]" />
          </motion.div>
        )}
      </div>

      <span
        className={`text-sm font-bold transition-colors duration-200
          ${selected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`}
      >
        {name}
      </span>
    </button>
  );
}
