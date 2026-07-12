import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Compass, Gift, User } from 'lucide-react';

export type NavTab = 'home' | 'explore' | 'rewards' | 'profile';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'rewards', label: 'Rewards', icon: Gift },
  { id: 'profile', label: 'Profile', icon: User },
];

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  // Dynamically compute active tab from the pathname prefix
  const currentPath = location.pathname.split('/')[1] || 'home';
  const activeTab = NAV_ITEMS.some((item) => item.id === currentPath)
    ? (currentPath as NavTab)
    : 'home';

  return (
    <nav
      role="navigation"
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe px-4 pb-3 pt-2"
    >
      <div
        className="mx-auto max-w-xs rounded-[2rem] px-2 py-2 flex items-center justify-around"
        style={{
          background: 'rgba(18,18,24,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(79,70,229,0.1)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/${item.id}`)}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-[1.5rem] outline-none select-none transition-all duration-200"
            >
              {/* Active pill */}
              {isActive && (
                <motion.div
                  layoutId="navPill"
                  className="absolute inset-0 rounded-[1.5rem]"
                  style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.3), rgba(124,58,237,0.2))' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="relative z-10"
              >
                <Icon className={`size-5 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-zinc-500'}`} />
              </motion.div>
              <span className={`relative z-10 text-[9px] font-black tracking-wide transition-colors duration-200 ${isActive ? 'text-primary' : 'text-zinc-600'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
