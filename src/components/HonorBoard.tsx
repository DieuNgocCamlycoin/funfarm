// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Honor Board - Bảng vinh danh thành tựu cộng đồng - Design theo thiết kế

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, Image, Video } from "lucide-react";
import camlyCoin from "@/assets/camly_coin.png";
import funFarmLogo from "@/assets/logo_fun_farm_web3.png";

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

// Sparkle particle component - hiệu ứng sao lấp lánh rơi
const SparkleParticles = () => {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 6}s`,
    duration: `${4 + Math.random() * 3}s`,
    size: 1 + Math.random() * 2,
    type: i % 4, // 0: white, 1: gold, 2: bright gold, 3: shimmer
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
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
              background: p.type === 0 
                ? '#ffffff'
                : p.type === 1 
                ? '#ffd700'
                : p.type === 2
                ? '#ffec8b'
                : '#fff8dc',
              boxShadow: `0 0 ${p.size * 3}px ${p.type === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,215,0,0.9)'}`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

// Corner ornament decorative
const CornerOrnament = ({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) => {
  const styles: Record<string, React.CSSProperties> = {
    'top-left': { top: 8, left: 8, borderTop: '3px solid', borderLeft: '3px solid', borderRadius: '8px 0 0 0' },
    'top-right': { top: 8, right: 8, borderTop: '3px solid', borderRight: '3px solid', borderRadius: '0 8px 0 0' },
    'bottom-left': { bottom: 8, left: 8, borderBottom: '3px solid', borderLeft: '3px solid', borderRadius: '0 0 0 8px' },
    'bottom-right': { bottom: 8, right: 8, borderBottom: '3px solid', borderRight: '3px solid', borderRadius: '0 0 8px 0' },
  };

  return (
    <div 
      className="absolute w-6 h-6 z-30"
      style={{
        ...styles[position],
        borderColor: '#ffd700',
        filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.8))',
      }}
    />
  );
};

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
      // Số liệu claimed được chốt theo blockchain thực tế
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
      className="relative overflow-hidden rounded-[20px] p-1 main-board-glow cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, #ffd700 0%, #b8860b 25%, #ffd700 50%, #daa520 75%, #ffd700 100%)',
        boxShadow: '0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.3)',
      }}
    >
      {/* Inner container with cosmos background */}
      <div 
        className="relative overflow-hidden rounded-[16px]"
        style={{
          background: 'linear-gradient(160deg, #1a472a 0%, #0d3320 20%, #0a2818 40%, #071f14 60%, #0a2818 80%, #0d3320 100%)',
        }}
      >
        {/* Cosmic gradient overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 20%, rgba(0, 100, 180, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, rgba(184, 134, 11, 0.25) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(34, 139, 34, 0.2) 0%, transparent 70%)
            `,
          }}
        />
        
        {/* Starfield effect */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.8), transparent),
              radial-gradient(2px 2px at 40px 70px, rgba(255,215,0,0.7), transparent),
              radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.6), transparent),
              radial-gradient(2px 2px at 130px 80px, rgba(255,215,0,0.5), transparent),
              radial-gradient(1px 1px at 160px 30px, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 50px 120px, rgba(255,215,0,0.6), transparent),
              radial-gradient(2px 2px at 180px 120px, rgba(255,255,255,0.5), transparent)
            `,
            backgroundSize: '200px 150px',
            animation: 'twinkle 3s ease-in-out infinite',
          }}
        />

        <SparkleParticles />
        
        {/* Golden glow from corners */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-radial from-yellow-500/30 to-transparent blur-xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-radial from-yellow-500/30 to-transparent blur-xl" />
        
        {/* Corner ornaments */}
        <CornerOrnament position="top-left" />
        <CornerOrnament position="top-right" />
        <CornerOrnament position="bottom-left" />
        <CornerOrnament position="bottom-right" />

        <div className={`relative z-10 ${compact ? 'p-4' : 'p-6'}`}>
          {/* Logo at top */}
          <div className="flex justify-center mb-3">
            <div 
              className="relative"
              style={{
                filter: 'drop-shadow(0 0 15px rgba(255,215,0,0.5))',
              }}
            >
              <img 
                src={funFarmLogo} 
                alt="FUN FARM Web3" 
                className={`${compact ? 'w-16 h-16' : 'w-20 h-20'} object-contain`}
              />
            </div>
          </div>

          {/* Title */}
          <h2 
            className={`text-center font-extrabold ${compact ? 'text-xl' : 'text-2xl md:text-3xl'} tracking-[0.15em] mb-5`}
            style={{
              color: '#ffd700',
              textShadow: `
                0 0 10px rgba(255, 215, 0, 1),
                0 0 20px rgba(255, 215, 0, 0.8),
                0 0 40px rgba(255, 215, 0, 0.6),
                0 2px 4px rgba(0, 0, 0, 0.8)
              `,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            HONOR BOARD
          </h2>

          {/* Stats */}
          <div className="space-y-3">
            {statItems.map((item, index) => (
              <div
                key={item.label}
                className="relative overflow-hidden rounded-xl transition-all duration-300 honor-card-hover honor-card-3d golden-border-shimmer"
                style={{
                  background: 'linear-gradient(135deg, rgba(10, 40, 24, 0.9) 0%, rgba(7, 31, 20, 0.95) 100%)',
                  border: '2px solid rgba(255, 215, 0, 0.6)',
                  boxShadow: '0 0 15px rgba(255, 215, 0, 0.3), inset 0 0 10px rgba(255, 215, 0, 0.1)',
                }}
              >
                <div className={`flex items-center gap-3 ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
                  {/* Icon */}
                  <div 
                    className={`${compact ? 'p-2' : 'p-2.5'} rounded-lg`}
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(184, 134, 11, 0.15))',
                      border: '1px solid rgba(255, 215, 0, 0.5)',
                    }}
                  >
                    <item.icon 
                      className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`}
                      style={{
                        color: '#ffd700',
                        filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.8))',
                      }}
                    />
                  </div>
                  
                  {/* Label */}
                  <span 
                    className={`flex-1 font-bold ${compact ? 'text-sm' : 'text-base'} tracking-wide`}
                    style={{
                      color: '#ffd700',
                      textShadow: '0 0 8px rgba(255, 215, 0, 0.6), 0 1px 2px rgba(0, 0, 0, 0.8)',
                    }}
                  >
                    {item.label}
                  </span>
                  
                  {/* Value */}
                  <span 
                    className={`font-extrabold ${compact ? 'text-lg' : 'text-xl'}`}
                    style={{
                      color: '#ffd700',
                      textShadow: `
                        0 0 10px rgba(255, 215, 0, 1),
                        0 0 20px rgba(255, 215, 0, 0.7),
                        0 2px 4px rgba(0, 0, 0, 0.8)
                      `,
                    }}
                  >
                    {isLoading ? "..." : <AnimatedCounter value={item.value} />}
                  </span>
                </div>
              </div>
            ))}

            {/* TOTAL REWARD with CAMLY coin */}
            <div
              className="relative overflow-hidden rounded-xl transition-all duration-300 honor-card-hover honor-card-3d golden-border-shimmer"
              style={{
                background: 'linear-gradient(135deg, rgba(10, 40, 24, 0.9) 0%, rgba(7, 31, 20, 0.95) 100%)',
                border: '2px solid rgba(255, 215, 0, 0.8)',
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.4), inset 0 0 15px rgba(255, 215, 0, 0.15)',
              }}
            >
              <div className={`flex items-center gap-3 ${compact ? 'px-3 py-3' : 'px-4 py-4'}`}>
                {/* CAMLY Coin */}
                <div 
                  className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg`}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(184, 134, 11, 0.2))',
                  }}
                >
                  <img 
                    src={camlyCoin} 
                    alt="CAMLY" 
                    className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} animate-coin-spin`}
                    style={{ 
                      filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.9))',
                    }}
                  />
                </div>
                
                {/* Label */}
                <span 
                  className={`flex-1 font-bold ${compact ? 'text-sm' : 'text-base'} tracking-wide`}
                  style={{
                    color: '#ffd700',
                    textShadow: '0 0 8px rgba(255, 215, 0, 0.6), 0 1px 2px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  TOTAL REWARD
                </span>
                
                {/* Value */}
                <span 
                  className={`font-extrabold ${compact ? 'text-xl' : 'text-2xl'}`}
                  style={{
                    color: '#ffd700',
                    textShadow: `
                      0 0 15px rgba(255, 215, 0, 1),
                      0 0 30px rgba(255, 215, 0, 0.7),
                      0 2px 4px rgba(0, 0, 0, 0.8)
                    `,
                  }}
                >
                  {isLoading ? "..." : <AnimatedCounter value={stats.totalReward} />}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HonorBoard;
