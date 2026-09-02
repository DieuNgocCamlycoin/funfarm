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
  background: 'linear-gradient(180deg, rgba(38,225,119,.28) 0%, transparent 24%, rgba(0,35,22,.27) 100%), linear-gradient(90deg, #03472d 0%, #087d43 15%, #10b950 34%, #0b963f 53%, #18c655 70%, #08763c 87%, #033d29 100%)',
  border: '1px solid #d8b84e',
  borderRadius: '15px',
  boxShadow: 'inset 0 2px 0 rgba(100,255,148,.48), inset 0 -8px 13px rgba(0,25,16,.29), inset 0 0 0 1px rgba(26,230,105,.14), 0 3px 9px rgba(0,51,31,.17)',
  position: 'relative' as const,
  overflow: 'hidden' as const,
  transition: 'transform 0.2s ease-out',
};

const totalRowStyle = {
  background: 'linear-gradient(180deg, rgba(35,214,111,.27) 0%, transparent 25%, rgba(0,30,19,.3) 100%), linear-gradient(90deg, #033f29 0%, #07763f 16%, #0faf4b 35%, #098b3b 54%, #16bf51 70%, #076b38 87%, #033825 100%)',
  border: '1px solid #d8b84e',
  borderRadius: '15px',
  boxShadow: 'inset 0 2px 0 rgba(94,250,141,.45), inset 0 -9px 14px rgba(0,23,15,.31), inset 0 0 0 1px rgba(24,219,100,.13), 0 3px 9px rgba(0,51,31,.18)',
  position: 'relative' as const,
  overflow: 'hidden' as const,
  transition: 'transform 0.2s ease-out',
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
    className={`stat-row-shine flex items-center justify-between ${compact ? 'px-3 py-2' : 'px-4 py-2.5'}`} 
    style={statRowStyle}
  >
    <div className="flex items-center gap-2">
      <Icon 
        className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-amber-300`} 
        style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.8))' }} 
      />
      <span 
        className={`ff-metallic-gold-text ${compact ? 'text-xs' : 'text-sm'} font-bold uppercase tracking-wide`}
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
    className={`stat-row-shine flex items-center justify-between ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`} 
    style={totalRowStyle}
  >
    <div className="flex items-center gap-2">
      <img 
        src={camlyCoin} 
        alt="CAMLY" 
        className={`${compact ? 'w-5 h-5' : 'w-6 h-6'}`}
        style={{ 
          filter: 'drop-shadow(0 1px 2px rgba(72,45,0,.28))',
        }}
      />
      <span 
        className={`ff-metallic-gold-text ${compact ? 'text-sm' : 'text-base'} font-extrabold uppercase tracking-wide`}
        style={{ 
          color: '#fbbf24',
          textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 12px rgba(251,191,36,0.6)' 
        }}
      >
        TOTAL REWARD
      </span>
    </div>
    <span 
      className={`ff-metallic-gold-text ${compact ? 'text-lg' : 'text-xl'} font-black tabular-nums`}
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
    <div className="ff-luxury-panel ff-honor-panel relative overflow-hidden rounded-2xl" data-angel-perch="honor">
      
      {/* Content */}
      <div className={`relative z-10 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="mb-3 flex items-center justify-center gap-3">
          <img 
            src={logoFunFarm} 
            alt="FUN FARM" 
            className={`${compact ? 'h-10 w-10' : 'h-12 w-12'} ff-honor-logo shrink-0 rounded-full object-cover`}
          />
          <h2 
          className="ff-metallic-gold-text whitespace-nowrap text-center uppercase"
          style={{ 
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 900,
            fontSize: compact ? '1.05rem' : '1.25rem',
            color: '#ffd700',
            textShadow: 'none',
            letterSpacing: '0.12em',
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

    </div>
  );
};

export default HonorBoard;
