// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Honor Board - Bảng vinh danh thành tựu cộng đồng - Design đồng bộ với ProfileHonorBoard

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, Image, Video, Coins } from "lucide-react";
import camlyCoin from "@/assets/camly_coin.png";
import logoFunFarm from "@/assets/logo_fun_farm_web3.png";
import honorBoardBg from "@/assets/honor-board-bg.jpeg";

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

  return <span>{displayValue.toLocaleString("vi-VN")}</span>;
};

// Styles - đồng bộ với ProfileHonorBoard
const goldTextStyle = "text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]";
const titleGoldStyle = "text-transparent bg-clip-text bg-gradient-to-b from-yellow-50 via-amber-200 to-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]";
// Viền kim loại sáng sang trọng
const metallicFrameStyle = "bg-black/20 border-2 border-amber-300/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_8px_rgba(251,191,36,0.3)] backdrop-blur-[2px] rounded-lg";
const goldenFrameStyle = "bg-black/25 border-2 border-amber-400/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_15px_rgba(251,191,36,0.35)] backdrop-blur-[2px] rounded-lg";

// Stat row component
const StatRow = ({ 
  icon: Icon, 
  label, 
  value,
  compact = false
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number;
  compact?: boolean;
}) => (
  <div className={`flex items-center justify-between ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} ${metallicFrameStyle}`}>
    <div className="flex items-center gap-2">
      <Icon 
        className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-amber-300`} 
        style={{ filter: 'drop-shadow(0 0 3px rgba(251,191,36,0.6))' }} 
      />
      <span className={`${compact ? 'text-xs' : 'text-sm'} font-bold uppercase tracking-wide ${goldTextStyle}`}>
        {label}
      </span>
    </div>
    <span className={`${compact ? 'text-sm' : 'text-base'} font-extrabold text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]`}>
      <AnimatedCounter value={value} />
    </span>
  </div>
);

// Total reward row with CAMLY coin
const TotalRewardRow = ({ 
  value,
  compact = false
}: { 
  value: number;
  compact?: boolean;
}) => (
  <div className={`flex items-center justify-between ${compact ? 'px-2 py-2' : 'px-3 py-3'} ${goldenFrameStyle}`}>
    <div className="flex items-center gap-2">
      <img 
        src={camlyCoin} 
        alt="CAMLY" 
        className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} animate-spin`}
        style={{ 
          animationDuration: '4s',
          filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.7))',
        }}
      />
      <span className={`${compact ? 'text-sm' : 'text-base'} font-extrabold uppercase tracking-wide ${goldTextStyle}`}>
        TOTAL REWARD
      </span>
    </div>
    <span 
      className={`${compact ? 'text-lg' : 'text-xl'} font-black tabular-nums ${titleGoldStyle}`}
      style={{ 
        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5)) drop-shadow(0 0 8px rgba(251,191,36,0.4))',
      }}
    >
      <AnimatedCounter value={value} />
    </span>
  </div>
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

      // Chỉ đếm bài viết gốc (không tính share)
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .neq("post_type", "share");

      const { data: postsWithMedia } = await supabase
        .from("posts")
        .select("images, video_url");

      let totalPhotos = 0;
      let totalVideos = 0;

      // Helper function để check video URL
      const isVideoUrl = (url: string): boolean => {
        const lowerUrl = url.toLowerCase();
        return lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.mov');
      };

      postsWithMedia?.forEach((post) => {
        // Đếm từ mảng images (có thể chứa cả video)
        if (post.images && Array.isArray(post.images)) {
          post.images.forEach((url: string) => {
            if (isVideoUrl(url)) {
              totalVideos += 1;
            } else {
              totalPhotos += 1;
            }
          });
        }
        // Đếm từ video_url riêng (nếu có)
        if (post.video_url) {
          totalVideos += 1;
        }
      });

      // Lấy pending_reward từ tất cả profiles
      const { data: rewardsData } = await supabase
        .from("profiles")
        .select("pending_reward");

      const totalPendingReward = rewardsData?.reduce((sum, profile) => {
        return sum + (profile.pending_reward || 0);
      }, 0) || 0;

      // TOTAL REWARD = Đã claim trên BSC (28,986,000) + Pending reward
      const CLAIMED_ON_BSC = 28986000;
      const totalReward = CLAIMED_ON_BSC + totalPendingReward;

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

  return (
    <div 
      className="relative overflow-hidden rounded-xl border-2 border-amber-400/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_20px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.25)]"
    >
      {/* Background image - giống ProfileHonorBoard */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${honorBoardBg})` }}
      />
      <div className="absolute inset-0 bg-black/10" />
      
      {/* Sparkle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-3 left-6 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-60" style={{ animationDuration: '3s' }} />
        <div className="absolute top-8 right-10 w-1 h-1 bg-yellow-200 rounded-full animate-ping opacity-50" style={{ animationDuration: '2.5s', animationDelay: '0.7s' }} />
        <div className="absolute bottom-10 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-40" style={{ animationDuration: '4s', animationDelay: '1.2s' }} />
        <div className="absolute top-1/2 right-6 w-1 h-1 bg-amber-300 rounded-full animate-ping opacity-40" style={{ animationDuration: '3.5s', animationDelay: '2s' }} />
        <div className="absolute bottom-6 right-1/3 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-50" style={{ animationDuration: '2.8s', animationDelay: '0.5s' }} />
      </div>
      
      {/* Top highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
      
      {/* Content */}
      <div className={`relative z-10 ${compact ? 'p-3' : 'p-4'}`}>
        {/* Header - Logo trên cùng, to hơn với viền tròn đẹp */}
        <div className="flex flex-col items-center mb-4">
          {/* Logo FUN FARM - To, viền tròn kim loại sáng */}
          <div 
            className="relative mb-3"
            style={{
              background: 'linear-gradient(145deg, rgba(251,191,36,0.8), rgba(180,140,30,0.9))',
              borderRadius: '50%',
              padding: '4px',
              boxShadow: '0 0 20px rgba(251,191,36,0.6), inset 0 2px 4px rgba(255,255,255,0.4), 0 4px 8px rgba(0,0,0,0.3)',
            }}
          >
            <img 
              src={logoFunFarm} 
              alt="FUN FARM" 
              className={`${compact ? 'w-16 h-16' : 'w-20 h-20'} rounded-full object-cover`}
              style={{ 
                border: '3px solid rgba(255,255,255,0.3)',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)',
              }}
            />
            {/* Glow ring */}
            <div 
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background: 'radial-gradient(circle, transparent 60%, rgba(251,191,36,0.4) 100%)',
                animationDuration: '2s',
              }}
            />
          </div>
          
          {/* Chữ HONOR BOARD - Kim loại vàng sáng */}
          <h2 
            className={`${compact ? 'text-xl' : 'text-2xl md:text-3xl'} font-black tracking-[0.1em] uppercase`}
            style={{ 
              fontFamily: "'Orbitron', 'Space Grotesk', sans-serif",
              background: 'linear-gradient(180deg, #fffbe6 0%, #ffe066 30%, #ffd700 50%, #ffe066 70%, #fffbe6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.8)) drop-shadow(0 0 25px rgba(251,191,36,0.5))',
            }}
          >
            HONOR BOARD
          </h2>
        </div>

        {/* Stats */}
        <div className={`space-y-${compact ? '1.5' : '2'}`}>
          {statItems.map((item) => (
            <StatRow 
              key={item.label}
              icon={item.icon} 
              label={item.label} 
              value={isLoading ? 0 : item.value}
              compact={compact}
            />
          ))}
          
          {/* Total Reward */}
          <TotalRewardRow 
            value={isLoading ? 0 : stats.totalReward}
            compact={compact}
          />
        </div>
      </div>

      {/* Bottom edge - giống ProfileHonorBoard */}
      <div className="relative z-10 h-1.5 bg-gradient-to-r from-emerald-600/30 via-amber-400/60 to-emerald-600/30" />
    </div>
  );
};

export default HonorBoard;
