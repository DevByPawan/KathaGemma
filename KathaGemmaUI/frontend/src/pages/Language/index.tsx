import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { LanguageCard } from '@/components/cards/LanguageCard';
import { Button } from '@/components/ui/button';

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
];

export default function Language() {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedLanguage) {
      // Temporarily store selection in localStorage/state placeholder
      localStorage.setItem('katha_language', selectedLanguage);
      navigate('/avatar');
    }
  };

  // Animation configurations
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
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring" as const, stiffness: 350, damping: 26 } 
    },
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col justify-between py-8 px-6 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute -left-24 -top-24 -z-10 size-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute -right-24 -bottom-24 -z-10 size-64 rounded-full bg-secondary/5 blur-3xl pointer-events-none" />

      {/* HEADER: Back Button */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/welcome')}
          aria-label="Back to welcome screen"
          className="p-2.5 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="size-5 text-zinc-400" />
        </button>
        <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest leading-none">Step 1 of 2</span>
        <div className="size-10" aria-hidden="true" /> {/* Spacer to align title */}
      </header>

      {/* MAIN CONTENT: Languages Grid */}
      <main className="w-full max-w-md mx-auto my-auto space-y-8">
        
        {/* Titles */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-2 text-center"
        >
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Choose Your Language
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm font-medium leading-relaxed max-w-xs mx-auto">
            Select the language you are most comfortable with.
          </p>
        </motion.div>

        {/* Card Options */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-3.5"
        >
          {LANGUAGES.map((lang) => (
            <motion.div key={lang.code} variants={itemVariants}>
              <LanguageCard
                language={lang.name}
                nativeName={lang.nativeName}
                flag={lang.flag}
                selected={selectedLanguage === lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
              />
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* FOOTER: Sticky Button */}
      <footer className="w-full max-w-md mx-auto pt-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Button
            onClick={handleContinue}
            disabled={!selectedLanguage}
            className="w-full text-base font-bold shadow-lg"
            size="lg"
          >
            Continue
          </Button>
        </motion.div>
      </footer>

    </div>
  );
}
