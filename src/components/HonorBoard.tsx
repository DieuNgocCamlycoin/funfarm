// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Honor Board - Bảng vinh danh thành tựu cộng đồng - Design mới với assets từ user

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, Image, Video } from "lucide-react";
import camlyCoin from "@/assets/camly_coin.png";
import logoFunFarm from "@/assets/logo_fun_farm_web3.png";
import glassFrame from "@/assets/honor-board/glass-frame.png";
import honorBoardTitle from "@/assets/honor-board/honor-board-title.png";
import statRowBg from "@/assets/honor-board/stat-row-bg.png";

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

// Stat row component with PNG background
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
    className={`relative flex items-center justify-between ${compact ? 'h-[42px]' : 'h-[50px]'}`}
  >
    {/* Green background image */}
    <img 
      src={statRowBg}
      alt=""
      className="absolute inset-0 w-full h-full object-fill rounded-lg"
      style={{
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
      }}
    />
    
    {/* Content overlay */}
    <div className={`relative z-10 flex items-center justify-between w-full ${compact ? 'px-3' : 'px-4'}`}>
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
    className={`relative flex items-center justify-between ${compact ? 'h-[50px]' : 'h-[58px]'}`}
  >
    {/* Green background image - slightly larger */}
    <img 
      src={statRowBg}
      alt=""
      className="absolute inset-0 w-full h-full object-fill rounded-lg"
      style={{
        filter: 'brightness(0.9) drop-shadow(0 3px 6px rgba(0,0,0,0.4))',
      }}
    />
    
    {/* Content overlay */}
    <div className={`relative z-10 flex items-center justify-between w-full ${compact ? 'px-3' : 'px-4'}`}>
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
      className="relative overflow-hidden rounded-2xl"
      data-angel-perch="honor"
    >
      {/* Glass Frame Background */}
      <img 
        src={glassFrame}
        alt=""
        className="absolute inset-0 w-full h-full object-cover rounded-2xl"
        style={{
          filter: 'brightness(1.05)',
        }}
      />
      
      {/* Dark overlay for better text contrast */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.35) 100%)',
        }}
      />
      
      {/* Sparkle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
        <div className="absolute top-4 left-8 w-2 h-2 bg-white rounded-full animate-ping opacity-70" style={{ animationDuration: '3s' }} />
        <div className="absolute top-12 right-12 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-ping opacity-60" style={{ animationDuration: '2.5s', animationDelay: '0.7s' }} />
        <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-50" style={{ animationDuration: '4s', animationDelay: '1.2s' }} />
        <div className="absolute top-1/2 right-8 w-1.5 h-1.5 bg-amber-300 rounded-full animate-ping opacity-50" style={{ animationDuration: '3.5s', animationDelay: '2s' }} />
        <div className="absolute bottom-12 right-1/3 w-2 h-2 bg-white rounded-full animate-ping opacity-60" style={{ animationDuration: '2.8s', animationDelay: '0.5s' }} />
      </div>
      
      {/* Content */}
      <div className={`relative z-10 ${compact ? 'p-4' : 'p-5'}`}>
        {/* Header - Logo trên cùng */}
        <div className="flex flex-col items-center mb-3">
          {/* Logo FUN FARM - Tỏa sáng, viền vàng kim loại phát sáng */}
          <div className="relative">
            <img 
              src={logoFunFarm} 
              alt="FUN FARM" 
              className={`${compact ? 'w-16 h-16' : 'w-20 h-20'} rounded-full object-cover`}
              style={{ 
                border: '4px solid rgba(251,191,36,0.8)',
                boxShadow: '0 0 30px rgba(251,191,36,0.8), 0 0 60px rgba(251,191,36,0.4)',
              }}
            />
            {/* Glow ring animation */}
            <div 
              className="absolute inset-[-6px] rounded-full animate-pulse pointer-events-none"
              style={{
                border: '2px solid rgba(255,225,53,0.6)',
                boxShadow: '0 0 25px rgba(251,191,36,0.6)',
                animationDuration: '2s',
              }}
            />
          </div>
        </div>
        
        {/* HONOR BOARD Title Image */}
        <div className="flex justify-center mb-5">
          <img 
            src={honorBoardTitle}
            alt="HONOR BOARD"
            className={`${compact ? 'w-[180px]' : 'w-[220px]'} h-auto`}
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6)) drop-shadow(0 0 20px rgba(255,215,0,0.4))',
            }}
          />
        </div>

        {/* Stats */}
        <div className={`space-y-${compact ? '2' : '2.5'}`}>
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
          <div className="pt-1">
            <TotalRewardRow 
              value={isLoading ? 0 : stats.totalReward}
              compact={compact}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HonorBoard;
