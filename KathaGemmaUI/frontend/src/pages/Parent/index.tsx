import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, BookOpen, Mic, Camera, Trophy, Star, Flame, Zap, 
  CheckCircle, RefreshCw, AlertCircle
} from 'lucide-react';
import { getChildStories, getChildProfile, type ChildProfileResponse, type StoryDetailsResponse } from '@/services/story';
import { getVoiceHistory, type VoiceHistoryLog } from '@/services/voice';
import { getCompletedMissions, type CompletedMission } from '@/services/camera';

type TabState = 'activity' | 'voice' | 'camera';

interface TimelineActivity {
  type: 'story' | 'voice' | 'camera' | 'badge';
  title: string;
  description: string;
  date: Date;
}

export default function Parent() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabState>('activity');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modular Data States
  const [profile, setProfile] = useState<ChildProfileResponse | null>(null);
  const [stories, setStories] = useState<StoryDetailsResponse[]>([]);
  const [voiceLogs, setVoiceLogs] = useState<VoiceHistoryLog[]>([]);
  const [cameraLogs, setCameraLogs] = useState<CompletedMission[]>([]);
  const [timeline, setTimeline] = useState<TimelineActivity[]>([]);

  // Fetch modular dashboard blocks
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Concurrent fetch of modular services
      const [profileData, storiesData, voiceData, cameraData] = await Promise.all([
        getChildProfile(),
        getChildStories(),
        getVoiceHistory(),
        getCompletedMissions(),
      ]);

      setProfile(profileData);
      setStories(storiesData);
      setVoiceLogs(voiceData);
      setCameraLogs(cameraData);

      // Compose recent activity timeline in-memory
      const compiledTimeline: TimelineActivity[] = [];

      storiesData.forEach(story => {
        compiledTimeline.push({
          type: 'story',
          title: story.status === 'COMPLETED' ? 'Book Completed' : 'Book Started',
          description: `${story.status === 'COMPLETED' ? 'Finished reading' : 'Started reading'} "${story.title}"`,
          date: new Date(story.createdAt),
        });
      });

      profileData.achievements.forEach(ach => {
        compiledTimeline.push({
          type: 'badge',
          title: 'Badge Unlocked',
          description: `Earned "${ach.badgeName}" badge!`,
          date: new Date(ach.unlockedAt),
        });
      });

      voiceData.forEach(voice => {
        compiledTimeline.push({
          type: 'voice',
          title: 'Voice Chat',
          description: `Spoke to Sparky: "${voice.transcript.substring(0, 60)}${voice.transcript.length > 60 ? '...' : ''}"`,
          date: new Date(voice.createdAt),
        });
      });

      cameraData.forEach(cam => {
        compiledTimeline.push({
          type: 'camera',
          title: 'Scavenger Hunt',
          description: cam.description,
          date: new Date(cam.unlockedAt),
        });
      });

      // Sort timeline descending
      const sortedTimeline = compiledTimeline
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5); // Lightweight: top 5 items only

      setTimeline(sortedTimeline);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Could not retrieve parenting insights. Please verify the backend is running!');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white font-sans flex flex-col justify-center items-center gap-3">
        <RefreshCw className="size-8 text-primary animate-spin" />
        <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Loading dashboard data...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white font-sans flex flex-col justify-center items-center p-6 text-center gap-4">
        <div className="size-14 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center">
          <AlertCircle className="size-7 text-red-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-black">Dashboard Error</h2>
          <p className="text-xs text-zinc-500 max-w-xs font-semibold">{error || 'Unknown error occurred.'}</p>
        </div>
        <button
          type="button"
          onClick={loadDashboardData}
          className="py-2.5 px-6 rounded-xl bg-primary text-xs font-black uppercase tracking-wider hover:bg-indigo-600 active:scale-95 transition-all cursor-pointer"
        >
          Retry Load
        </button>
      </div>
    );
  }

  // Stats Calculations
  const storiesCompletedCount = stories.filter(s => s.status === 'COMPLETED').length;
  const companionName = localStorage.getItem('katha_avatar') || 'panda';
  const companionDisplayName: Record<string, string> = {
    panda: 'Pipo the Panda 🐼',
    elephant: 'Elly the Elephant 🐘',
    fox: 'Fiona the Fox 🦊',
    parrot: 'Pip the Parrot 🦜',
  };

  // Timeline item icon mapper
  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'story': return <BookOpen className="size-4 text-blue-400" />;
      case 'voice': return <Mic className="size-4 text-teal-400" />;
      case 'camera': return <Camera className="size-4 text-orange-400" />;
      case 'badge': return <Trophy className="size-4 text-purple-400" />;
      default: return <Star className="size-4 text-zinc-400" />;
    }
  };

  // Time formatter
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans pb-12 overflow-x-hidden">
      
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-md px-4 pt-5 space-y-6">
        
        {/* Header bar */}
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/home')}
            aria-label="Back to home"
            className="p-2.5 rounded-full border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900 active:scale-95 transition-all outline-none"
          >
            <ArrowLeft className="size-5 text-zinc-400" />
          </button>
          <div>
            <h1 className="text-sm font-black text-center uppercase tracking-widest text-zinc-400">Parent Dashboard</h1>
          </div>
          <div className="size-10" />
        </header>

        {/* 1. CHILD PROFILE SNAPSHOT CARD */}
        <section className="p-5 rounded-3xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-secondary flex items-center justify-center text-white text-2xl font-black shadow-md">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-black text-white">{profile.name}</h2>
                <p className="text-xs text-zinc-500 font-semibold">
                  Age {profile.age} · Companion: {companionDisplayName[companionName] || 'Pipo the Panda'}
                </p>
              </div>
            </div>
            
            {/* Level status */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                <Star className="size-3 fill-amber-500 text-amber-500" />
                Level {profile.currentLevel}
              </span>
            </div>
          </div>

          {/* Gamified stats bar (XP and Streak) */}
          <div className="border-t border-zinc-850 pt-4 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Flame className="size-5 text-orange-400 fill-orange-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider leading-none">Streak</p>
                <p className="text-sm font-black text-orange-400 mt-1 leading-none">{profile.streak} Days</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Zap className="size-5 text-amber-400 fill-amber-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider leading-none">Total XP</p>
                <p className="text-sm font-black text-amber-400 mt-1 leading-none">{profile.xp} XP</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. STATS ANALYTICS GRID */}
        <section className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total Books', value: stories.length, icon: BookOpen, color: 'text-blue-400' },
            { label: 'Completed', value: storiesCompletedCount, icon: CheckCircle, color: 'text-green-400' },
            { label: 'Voice Chats', value: voiceLogs.length, icon: Mic, color: 'text-teal-400' },
            { label: 'Missions', value: cameraLogs.length, icon: Camera, color: 'text-orange-400' },
          ].map(stat => (
            <div 
              key={stat.label}
              className="p-3 rounded-2xl border border-zinc-800 bg-zinc-900/20 text-center flex flex-col items-center justify-center gap-1.5"
            >
              <stat.icon className={`size-4 ${stat.color}`} />
              <p className="text-base font-black text-white leading-none">{stat.value}</p>
              <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wide leading-none">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* 3. TABS CONTAINER */}
        <section className="space-y-4">
          
          {/* Tab buttons */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850">
            {[
              { id: 'activity' as TabState, label: 'Timeline' },
              { id: 'voice' as TabState, label: 'Voice Chats' },
              { id: 'camera' as TabState, label: 'Camera History' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-colors cursor-pointer
                  ${activeTab === tab.id 
                    ? 'bg-primary text-white shadow' 
                    : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab views with AnimatePresence */}
          <div className="min-h-[220px]">
            <AnimatePresence mode="wait">
              
              {/* Timeline tab view */}
              {activeTab === 'activity' && (
                <motion.div
                  key="activity-view"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-3"
                >
                  {timeline.length === 0 ? (
                    <div className="py-12 text-center text-xs text-zinc-500 font-semibold border border-zinc-800/80 rounded-2xl bg-zinc-900/10">
                      No recent activities recorded yet.
                    </div>
                  ) : (
                    timeline.map((act, idx) => (
                      <div 
                        key={idx}
                        className="flex gap-3 p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/25 items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-8.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center flex-shrink-0">
                            {getTimelineIcon(act.type)}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white leading-tight">{act.title}</h4>
                            <p className="text-[11px] text-zinc-500 font-semibold mt-0.5 leading-snug">{act.description}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-zinc-500 whitespace-nowrap">{formatTimeAgo(act.date)}</span>
                      </div>
                    ))
                  )}
                </motion.div>
              )}

              {/* Voice history tab view */}
              {activeTab === 'voice' && (
                <motion.div
                  key="voice-view"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-3"
                >
                  {voiceLogs.length === 0 ? (
                    <div className="py-12 text-center text-xs text-zinc-500 font-semibold border border-zinc-800/80 rounded-2xl bg-zinc-900/10">
                      No conversations recorded yet.
                    </div>
                  ) : (
                    voiceLogs.slice(0, 5).map(log => (
                      <div 
                        key={log.id}
                        className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/25 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-teal-400 bg-teal-400/10 border border-teal-400/15 px-2 py-0.5 rounded-full">
                            Voice Log
                          </span>
                          <span className="text-[9px] font-bold text-zinc-500">{formatTimeAgo(new Date(log.createdAt))}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] text-zinc-300 font-semibold bg-zinc-950/60 p-2 rounded-xl border border-zinc-850">
                            <span className="text-teal-400 font-black text-[9px] uppercase tracking-wider block mb-0.5">Child Asked</span>
                            "{log.transcript}"
                          </p>
                          <p className="text-[11px] text-zinc-400 font-semibold p-2">
                            <span className="text-indigo-400 font-black text-[9px] uppercase tracking-wider block mb-0.5">Katha Replied</span>
                            {log.aiResponse}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}

              {/* Camera achievements tab view */}
              {activeTab === 'camera' && (
                <motion.div
                  key="camera-view"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-3"
                >
                  {cameraLogs.length === 0 ? (
                    <div className="py-12 text-center text-xs text-zinc-500 font-semibold border border-zinc-800/80 rounded-2xl bg-zinc-900/10">
                      No completed scavenger missions.
                    </div>
                  ) : (
                    cameraLogs.slice(0, 5).map(log => (
                      <div 
                        key={log.id}
                        className="flex p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/25 items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                            <Camera className="size-5 text-orange-400" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white leading-tight">Target Object Discovered</h4>
                            <p className="text-[11px] text-zinc-500 font-semibold mt-0.5">{log.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-zinc-500 block mb-0.5">{formatTimeAgo(new Date(log.unlockedAt))}</span>
                          <span className="text-[9px] font-black text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">+50 XP</span>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </section>

      </div>
    </div>
  );
}
