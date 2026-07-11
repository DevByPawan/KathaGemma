import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/welcome');
    }, 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white font-sans">
      <div className="space-y-4 text-center">
        <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent animate-pulse">
          KathaGemma
        </h1>
        <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">
          AI Storytelling Companion
        </p>
      </div>
    </div>
  );
}
