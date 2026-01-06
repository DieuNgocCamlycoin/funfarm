// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Honor Board - Bảng vinh danh thành tựu cộng đồng - Design đồng bộ với ProfileHonorBoard

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, Image, Video, Coins } from "lucide-react";
import camlyCoin from "@/assets/camly_coin.png";
import logoFunFarm from "@/assets/logo_fun_farm_web3.png";

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

// Styles - Stat rows với hiệu ứng bóng gương + viền vàng kim loại
const statRowStyle = {
  background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 30%, #16a34a 60%, #15803d 100%)',
  border: '2px solid #fbbf24',
  borderRadius: '25px',
  boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.5), inset 0 -4px 12px rgba(0,0,0,0.2), 0 0 10px rgba(251,191,36,0.5), 0 4px 8px rgba(0,0,0,0.3)',
};

const totalRowStyle = {
  background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 40%, #15803d 70%, #166534 100%)',
  border: '2.5px solid #fbbf24',
  borderRadius: '25px',
  boxShadow: 'inset 0 10px 20px rgba(255,255,255,0.45), inset 0 -5px 15px rgba(0,0,0,0.25), 0 0 15px rgba(251,191,36,0.6), 0 6px 12px rgba(0,0,0,0.35)',
};

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
  <div 
    className={`flex items-center justify-between ${compact ? 'px-3 py-2' : 'px-4 py-2.5'}`} 
    style={statRowStyle}
  >
    <div className="flex items-center gap-2">
      <Icon 
        className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-amber-300`} 
        style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.8))' }} 
      />
      <span 
        className={`${compact ? 'text-xs' : 'text-sm'} font-bold uppercase tracking-wide`}
        style={{ 
          color: '#fbbf24',
          textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 10px rgba(251,191,36,0.5)' 
        }}
      >
        {label}
      </span>
    </div>
    <span 
      className={`${compact ? 'text-sm' : 'text-base'} font-extrabold text-white tabular-nums`}
      style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
    >
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
  <div 
    className={`flex items-center justify-between ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`} 
    style={totalRowStyle}
  >
    <div className="flex items-center gap-2">
      <img 
        src={camlyCoin} 
        alt="CAMLY" 
        className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} animate-spin`}
        style={{ 
          animationDuration: '4s',
          filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.9))',
        }}
      />
      <span 
        className={`${compact ? 'text-sm' : 'text-base'} font-extrabold uppercase tracking-wide`}
        style={{ 
          color: '#fbbf24',
          textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 12px rgba(251,191,36,0.6)' 
        }}
      >
        TOTAL REWARD
      </span>
    </div>
    <span 
      className={`${compact ? 'text-lg' : 'text-xl'} font-black tabular-nums`}
      style={{ 
        color: '#ffd700',
        textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 20px rgba(255,215,0,0.7)' 
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
      className="relative overflow-hidden rounded-xl"
      data-angel-perch="honor"
      style={{
        background: 'linear-gradient(135deg, rgba(120,200,255,0.12) 0%, rgba(255,255,255,0.08) 30%, rgba(180,220,255,0.15) 70%, rgba(255,255,255,0.1) 100%)',
        backdropFilter: 'saturate(120%)',
        border: '4px solid rgba(255, 255, 255, 0.9)',
        borderRadius: '20px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(255,255,255,0.3), 0 0 15px rgba(255,255,255,0.3), 0 8px 32px rgba(0,0,0,0.25)',
      }}
    >
      {/* Sparkle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-3 left-6 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-60" style={{ animationDuration: '3s' }} />
        <div className="absolute top-8 right-10 w-1 h-1 bg-yellow-200 rounded-full animate-ping opacity-50" style={{ animationDuration: '2.5s', animationDelay: '0.7s' }} />
        <div className="absolute bottom-10 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-40" style={{ animationDuration: '4s', animationDelay: '1.2s' }} />
        <div className="absolute top-1/2 right-6 w-1 h-1 bg-amber-300 rounded-full animate-ping opacity-40" style={{ animationDuration: '3.5s', animationDelay: '2s' }} />
        <div className="absolute bottom-6 right-1/3 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-50" style={{ animationDuration: '2.8s', animationDelay: '0.5s' }} />
      </div>
      
      {/* Top highlight - Liquid Glass edge */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      
      {/* Content */}
      <div className={`relative z-10 ${compact ? 'p-3' : 'p-4'}`}>
        {/* Header - Logo trên cùng, to hơn với viền tròn đẹp */}
        <div className="flex flex-col items-center mb-4">
          {/* Logo FUN FARM - Tỏa sáng, viền vàng kim loại phát sáng */}
          <div className="relative">
            <img 
              src={logoFunFarm} 
              alt="FUN FARM" 
              className={`${compact ? 'w-16 h-16' : 'w-20 h-20'} rounded-full object-cover`}
              style={{ 
                border: '4px solid rgba(251,191,36,0.7)',
                boxShadow: '0 0 25px rgba(251,191,36,0.7), 0 0 50px rgba(251,191,36,0.3)',
              }}
            />
            {/* Glow ring animation */}
            <div 
              className="absolute inset-[-4px] rounded-full animate-pulse pointer-events-none"
              style={{
                border: '2px solid rgba(255,225,53,0.5)',
                boxShadow: '0 0 20px rgba(251,191,36,0.5)',
                animationDuration: '2s',
              }}
            />
          </div>
        </div>
        
        {/* Chữ HONOR BOARD - căn đều giữa logo và stats */}
        <h2 
          className="uppercase relative text-center whitespace-nowrap mt-3 mb-5"
          style={{ 
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 900,
            fontSize: compact ? '1.4rem' : '1.7rem',
            color: '#ffd700',
            textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 25px rgba(255,215,0,0.7)',
            letterSpacing: '0.15em',
          }}
        >
          HONOR BOARD
        </h2>

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

      {/* Bottom edge - Liquid Glass */}
      <div className="relative z-10 h-1.5 bg-gradient-to-r from-white/10 via-white/30 to-white/10" />
    </div>
  );
};

export default HonorBoard;
