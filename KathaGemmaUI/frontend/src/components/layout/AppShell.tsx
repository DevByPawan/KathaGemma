import { createContext, useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Bell } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';
import { getChildProfile, type ChildProfileResponse } from '@/services/story';

interface AppShellContextType {
  profile: ChildProfileResponse | null;
  isLoading: boolean;
  reloadProfile: () => Promise<void>;
}

const AppShellContext = createContext<AppShellContextType | undefined>(undefined);

export function useAppShellContext() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error('useAppShellContext must be used within an AppShellProvider');
  }
  return context;
}

function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <motion.div
        className="absolute -top-32 -left-32 w-80 h-80 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
    </div>
  );
}

export function AppShell() {
  const [profile, setProfile] = useState<ChildProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reloadProfile = async () => {
    try {
      const data = await getChildProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load child profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadProfile();
  }, []);

  // Extract first letter of name for the avatar badge
  const initial = profile?.name ? profile.name.charAt(0).toUpperCase() : 'L';
  const xp = profile?.xp ?? 0;

  return (
    <AppShellContext.Provider value={{ profile, isLoading, reloadProfile }}>
      <div className="min-h-screen bg-[#09090b] text-white font-sans pb-28 overflow-x-hidden relative">
        <BackgroundBlobs />
        <div className="relative z-10 mx-auto max-w-md px-4 pt-5 space-y-5">
          {/* Standardized Header */}
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            {/* XP Pill */}
            <motion.div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10"
              whileHover={{ scale: 1.04 }}
            >
              <Zap className="size-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-black text-amber-300">{xp} XP</span>
            </motion.div>

            {/* Today's status */}
            <div className="text-center">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Today's Quest</p>
              <motion.div
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <span className="text-xs font-semibold text-primary">⚡ 3 adventures await</span>
              </motion.div>
            </div>

            {/* Notification & Avatar */}
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                aria-label="Notifications"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="relative p-2 rounded-full border border-zinc-800 bg-zinc-900/70"
              >
                <Bell className="size-4 text-zinc-400" />
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-secondary" />
              </motion.button>

              {/* Profile Avatar Badge */}
              <motion.div whileHover={{ scale: 1.05 }} className="relative cursor-pointer">
                <div className="size-9 rounded-full bg-gradient-to-br from-primary via-purple-600 to-secondary flex items-center justify-center text-white font-black text-sm ring-2 ring-primary/40">
                  {initial}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-green-500 ring-2 ring-[#09090b]" />
              </motion.div>
            </div>
          </motion.header>

          {/* Viewport for subroutes */}
          <div className="w-full">
            <Outlet />
          </div>
        </div>

        <BottomNavigation />
      </div>
    </AppShellContext.Provider>
  );
}
