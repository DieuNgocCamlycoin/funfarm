// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Honor Board - Bảng vinh danh thành tựu cộng đồng - Cosmos Design

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, Image, Video, Coins } from "lucide-react";
import camlyCoin from "@/assets/camly_coin.png";

interface HonorStats {
  totalUsers: number;
  totalPosts: number;
  totalPhotos: number;
  totalVideos: number;
  totalReward: number;
}

interface HonorBoardProps {
  compact?: boolean;
}

// Animated counter component
const AnimatedCounter = ({ value, duration = 1500 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const countRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (countRef.current) clearInterval(countRef.current);
    
    const startValue = displayValue;
    const difference = value - startValue;
    const steps = 60;
    const stepValue = difference / steps;
    const stepDuration = duration / steps;
    let currentStep = 0;

    countRef.current = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(countRef.current);
      } else {
        setDisplayValue(Math.round(startValue + stepValue * currentStep));
      }
    }, stepDuration);

    return () => {
      if (countRef.current) clearInterval(countRef.current);
    };
  }, [value]);

  return <span className="animate-counter-pulse">{displayValue.toLocaleString("vi-VN")}</span>;
};

// Sparkle particle component
const SparkleParticles = () => {
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 8}s`,
    duration: `${6 + Math.random() * 4}s`,
    size: Math.random() > 0.5 ? 2 : 1,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-sparkle-fall"
          style={{
            left: p.left,
            top: '-10px',
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        >
          <div 
            className="rounded-full"
            style={{
              width: p.size + 'px',
              height: p.size + 'px',
              background: p.id % 3 === 0 
                ? 'rgba(255, 215, 0, 0.9)' 
                : 'rgba(255, 255, 255, 0.8)',
              boxShadow: '0 0 4px rgba(255, 215, 0, 0.6)',
            }}
          />
        </div>
      ))}
    </div>
  );
};

// Star field component with parallax
const StarField = ({ moving = false }: { moving?: boolean }) => (
  <div 
    className={`absolute inset-0 starfield ${moving ? 'animate-float-star' : ''}`}
    style={{ opacity: 0.8 }}
  />
);

const HonorBoard = ({ compact = false }: HonorBoardProps) => {
  const [stats, setStats] = useState<HonorStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalPhotos: 0,
    totalVideos: 0,
    totalReward: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });

      const { data: postsWithMedia } = await supabase
        .from("posts")
        .select("images, video_url");

      let totalPhotos = 0;
      let totalVideos = 0;

      postsWithMedia?.forEach((post) => {
        if (post.images && Array.isArray(post.images)) {
          totalPhotos += post.images.length;
        }
        if (post.video_url) {
          totalVideos += 1;
        }
      });

      const { data: rewardsData } = await supabase
        .from("profiles")
        .select("pending_reward, camly_balance");

      const totalReward = rewardsData?.reduce((sum, profile) => {
        return sum + (profile.pending_reward || 0) + (profile.camly_balance || 0);
      }, 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalPosts: postsCount || 0,
        totalPhotos,
        totalVideos,
        totalReward,
      });
    } catch (error) {
      console.error("Error fetching honor stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const statItems = [
    { icon: Users, label: "TOTAL USERS", value: stats.totalUsers },
    { icon: FileText, label: "TOTAL POSTS", value: stats.totalPosts },
    { icon: Image, label: "TOTAL PHOTOS", value: stats.totalPhotos },
    { icon: Video, label: "TOTAL VIDEOS", value: stats.totalVideos },
  ];

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-2xl cosmos-bg-compact p-4 animate-golden-glow"
        style={{
          border: '3px solid',
          borderImage: 'linear-gradient(135deg, hsl(50 100% 65%), hsl(45 100% 58%), hsl(50 100% 70%)) 1',
        }}
      >
        <StarField />
        <SparkleParticles />
        
        {/* Bright golden halo effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-yellow-400/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)]" />
        
        <div className="relative z-10">
          <h3 className="text-center font-bold text-lg tracking-widest mb-3 animate-text-glow"
            style={{
              background: 'linear-gradient(90deg, #fff, #ffd700, #fff, #ffd700, #fff)',
              backgroundSize: '200% 100%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'text-glow-pulse 3s ease-in-out infinite, shimmer 4s ease-in-out infinite',
            }}
          >
            ✨ HONOR BOARD ✨
          </h3>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            {statItems.map((item) => (
              <div 
                key={item.label} 
                className="honor-stat-box flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-300"
              >
                <item.icon className="w-3.5 h-3.5 text-yellow-500 drop-shadow-[0_0_6px_rgba(255,215,0,0.9)]" />
                <span className="text-white/90 truncate font-medium">{item.label.split(' ')[1]}</span>
                <span className="ml-auto font-bold text-yellow-400 drop-shadow-[0_0_8px_rgba(255,215,0,0.7)]">
                  {isLoading ? "..." : <AnimatedCounter value={item.value} />}
                </span>
              </div>
            ))}
          </div>
          
          {/* CAMLY Reward with spinning coin */}
          <div 
            className="mt-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 215, 0, 0.15))',
              border: '2px solid rgba(255, 215, 0, 0.6)',
              boxShadow: '0 0 15px rgba(255, 215, 0, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.1)',
            }}
          >
            <img 
              src={camlyCoin} 
              alt="CAMLY" 
              className="w-5 h-5 animate-coin-spin"
              style={{ filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 1))' }}
            />
            <span className="text-white/90 text-xs font-medium">REWARD</span>
            <span className="font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
              {isLoading ? "..." : <AnimatedCounter value={stats.totalReward} />}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative overflow-hidden rounded-3xl cosmos-bg p-6 animate-golden-glow"
      style={{
        border: '4px solid',
        borderImage: 'linear-gradient(135deg, hsl(50 100% 70%), hsl(45 100% 60%), hsl(50 100% 75%), hsl(45 100% 65%)) 1',
      }}
    >
      {/* Star field with parallax */}
      <StarField moving />
      <SparkleParticles />
      
      {/* Bright golden halo effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-yellow-400/15 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.25)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.15)_0%,transparent_70%)]" />
      
      {/* Golden corner ornaments with stronger glow */}
      <div className="absolute top-3 left-3 w-10 h-10"
        style={{ borderTop: '4px solid rgba(255, 215, 0, 1)', borderLeft: '4px solid rgba(255, 215, 0, 1)', borderRadius: '10px 0 0 0', filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))' }} />
      <div className="absolute top-3 right-3 w-10 h-10"
        style={{ borderTop: '4px solid rgba(255, 215, 0, 1)', borderRight: '4px solid rgba(255, 215, 0, 1)', borderRadius: '0 10px 0 0', filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))' }} />
      <div className="absolute bottom-3 left-3 w-10 h-10"
        style={{ borderBottom: '4px solid rgba(255, 215, 0, 1)', borderLeft: '4px solid rgba(255, 215, 0, 1)', borderRadius: '0 0 0 10px', filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))' }} />
      <div className="absolute bottom-3 right-3 w-10 h-10"
        style={{ borderBottom: '4px solid rgba(255, 215, 0, 1)', borderRight: '4px solid rgba(255, 215, 0, 1)', borderRadius: '0 0 10px 0', filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))' }} />

      {/* Twinkling stars - brighter */}
      <div className="absolute top-8 left-10 w-2 h-2 bg-white rounded-full animate-twinkle" style={{ animationDelay: '0s', boxShadow: '0 0 8px rgba(255, 255, 255, 0.9)' }} />
      <div className="absolute top-16 right-12 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-twinkle" style={{ animationDelay: '0.5s', boxShadow: '0 0 6px rgba(255, 215, 0, 0.9)' }} />
      <div className="absolute bottom-20 left-8 w-2.5 h-2.5 bg-white rounded-full animate-twinkle-slow" style={{ animationDelay: '1s', boxShadow: '0 0 10px rgba(255, 255, 255, 0.9)' }} />
      <div className="absolute bottom-12 right-8 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-twinkle" style={{ animationDelay: '1.5s', boxShadow: '0 0 6px rgba(255, 215, 0, 0.8)' }} />
      <div className="absolute top-1/2 left-4 w-1.5 h-1.5 bg-white rounded-full animate-twinkle-slow" style={{ animationDelay: '2s', boxShadow: '0 0 6px rgba(255, 255, 255, 0.8)' }} />
      <div className="absolute top-1/3 right-6 w-2 h-2 bg-yellow-400 rounded-full animate-twinkle" style={{ animationDelay: '0.3s', boxShadow: '0 0 8px rgba(255, 215, 0, 1)' }} />

      <div className="relative z-10">
        {/* Title with glow effect */}
        <h2 
          className="text-center font-bold text-2xl md:text-3xl tracking-[0.2em] mb-6 animate-text-glow"
          style={{
            background: 'linear-gradient(90deg, #fff8dc, #ffd700, #fff8dc, #ffd700, #fff8dc)',
            backgroundSize: '200% 100%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'text-glow-pulse 3s ease-in-out infinite, shimmer 4s ease-in-out infinite',
          }}
        >
          ✨ HONOR BOARD ✨
        </h2>

        {/* Stats */}
        <div className="space-y-3">
          {statItems.map((item, index) => (
            <div
              key={item.label}
              className="honor-stat-box flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300 hover:scale-[1.02] group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div 
                className="p-2.5 rounded-lg transition-all duration-300 group-hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.4), rgba(255, 255, 255, 0.2))',
                  border: '2px solid rgba(255, 215, 0, 0.7)',
                  boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)',
                }}
              >
                <item.icon className="w-5 h-5 text-yellow-500 drop-shadow-[0_0_8px_rgba(255,215,0,1)]" />
              </div>
              <span className="font-semibold tracking-wide flex-1 text-white/95">
                {item.label}
              </span>
              <span 
                className="font-bold text-xl drop-shadow-[0_0_10px_rgba(255,215,0,0.7)]"
                style={{
                  background: 'linear-gradient(90deg, #fff, #ffd700, #fff)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {isLoading ? "..." : <AnimatedCounter value={item.value} />}
              </span>
            </div>
          ))}

          {/* TOTAL REWARD with spinning CAMLY coin */}
          <div
            className="flex items-center gap-4 rounded-xl px-4 py-4 transition-all duration-300 hover:scale-[1.02] group"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(0, 0, 0, 0.4))',
              border: '2px solid rgba(255, 215, 0, 0.5)',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.2), inset 0 0 20px rgba(255, 215, 0, 0.1)',
            }}
          >
            <div 
              className="p-2 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.15))',
              }}
            >
              <img 
                src={camlyCoin} 
                alt="CAMLY Coin" 
                className="w-8 h-8 animate-coin-spin"
                style={{ filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.9))' }}
              />
            </div>
            <span 
              className="font-semibold tracking-wide flex-1"
              style={{ color: 'rgba(255, 248, 220, 0.95)' }}
            >
              TOTAL REWARD
            </span>
            <span 
              className="font-bold text-2xl animate-text-glow"
              style={{
                background: 'linear-gradient(90deg, #ffd700, #fff, #ffd700)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {isLoading ? "..." : <AnimatedCounter value={stats.totalReward} />}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HonorBoard;
