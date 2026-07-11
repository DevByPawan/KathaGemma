import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { AvatarCard, type AvatarType } from '@/components/cards/AvatarCard';
import { Button } from '@/components/ui/button';

interface AvatarBuddy {
  id: AvatarType;
  name: string;
}

const BUDDIES: AvatarBuddy[] = [
  { id: 'panda', name: 'Pipo the Panda' },
  { id: 'elephant', name: 'Elly the Elephant' },
  { id: 'fox', name: 'Fiona the Fox' },
  { id: 'parrot', name: 'Pip the Parrot' },
];

export default function Avatar() {
  const navigate = useNavigate();
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarType | null>(null);

  const handleStartAdventure = () => {
    if (selectedAvatar) {
      // Temporarily store selection in localStorage/state placeholder
      localStorage.setItem('katha_avatar', selectedAvatar);
      navigate('/home');
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 15 },
    show: { 
      opacity: 1, 
      scale: 1,
      y: 0, 
      transition: { type: "spring" as const, stiffness: 350, damping: 24 } 
    },
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col justify-between py-8 px-6 relative overflow-hidden">
      
      {/* Background radial overlays */}
      <div className="absolute -left-24 -top-24 -z-10 size-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute -right-24 -bottom-24 -z-10 size-64 rounded-full bg-secondary/5 blur-3xl pointer-events-none" />

      {/* HEADER: Back Button */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/language')}
          aria-label="Back to language select screen"
          className="p-2.5 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="size-5 text-zinc-400" />
        </button>
        <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest leading-none">Step 2 of 2</span>
        <div className="size-10" aria-hidden="true" />
      </header>

      {/* MAIN CONTENT: 2x2 Buddies Grid */}
      <main className="w-full max-w-md mx-auto my-auto space-y-8">
        
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-2 text-center"
        >
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Choose Your Learning Buddy
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm font-medium leading-relaxed max-w-xs mx-auto">
            Your buddy will guide you through magical adventures.
          </p>
        </motion.div>

        {/* 2x2 Selection Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-x-4 gap-y-6 justify-items-center"
        >
          {BUDDIES.map((buddy) => (
            <motion.div key={buddy.id} variants={itemVariants}>
              <AvatarCard
                name={buddy.name}
                avatarType={buddy.id}
                selected={selectedAvatar === buddy.id}
                onClick={() => setSelectedAvatar(buddy.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* FOOTER: Primary Trigger */}
      <footer className="w-full max-w-md mx-auto pt-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Button
            onClick={handleStartAdventure}
            disabled={!selectedAvatar}
            className="w-full text-base font-bold shadow-lg animate-shimmer"
            size="lg"
          >
            Start Adventure
          </Button>
        </motion.div>
      </footer>

    </div>
  );
}
