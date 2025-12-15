// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Top Ranking - Bảng xếp hạng người dùng lương thiện - Cosmos Design

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Crown, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import funFarmLogo from "@/assets/logo_fun_farm_web3.png";
import camlyCoin from "@/assets/camly_coin.png";

interface TopUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_reward: number;
  is_good_heart: boolean;
}

interface TopRankingProps {
  compact?: boolean;
}

// Sparkle particles
const SparkleParticles = () => {
  const particles = Array.from({ length: 12 }, (_, i) => ({
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

// Laurel wreath SVG
const LaurelWreath = ({ size = 'md', rank }: { size?: 'sm' | 'md' | 'lg'; rank: number }) => {
  const dimensions = { sm: 36, md: 52, lg: 64 };
  const dim = dimensions[size];
  
  const color = rank === 1 
    ? '#ffd700' 
    : rank === 2 
    ? '#c0c0c0' 
    : rank === 3 
    ? '#cd7f32' 
    : 'rgba(255, 215, 0, 0.5)';

  return (
    <svg 
      width={dim} 
      height={dim} 
      viewBox="0 0 100 100" 
      className={rank <= 3 ? 'animate-laurel-glow' : ''}
      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
    >
      {/* Left laurel branch */}
      <path
        d="M30 50 Q20 35 25 20 Q30 25 32 40 Q28 45 30 50"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.8"
      />
      <path
        d="M28 55 Q15 45 18 28 Q25 32 30 48"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.7"
      />
      <path
        d="M26 60 Q12 55 12 38 Q20 42 28 56"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.6"
      />
      
      {/* Right laurel branch (mirrored) */}
      <path
        d="M70 50 Q80 35 75 20 Q70 25 68 40 Q72 45 70 50"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.8"
      />
      <path
        d="M72 55 Q85 45 82 28 Q75 32 70 48"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.7"
      />
      <path
        d="M74 60 Q88 55 88 38 Q80 42 72 56"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.6"
      />
    </svg>
  );
};

// Crown icon for top 3
const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return (
      <div className="relative">
        <Crown 
          className="w-6 h-6 text-yellow-400 animate-pulse" 
          style={{ filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))' }}
        />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div 
        className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm"
        style={{ 
          background: 'linear-gradient(135deg, #c0c0c0, #e8e8e8)',
          color: '#333',
          boxShadow: '0 0 8px rgba(192, 192, 192, 0.6)',
        }}
      >
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div 
        className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm"
        style={{ 
          background: 'linear-gradient(135deg, #cd7f32, #daa520)',
          color: '#fff',
          boxShadow: '0 0 8px rgba(205, 127, 50, 0.6)',
        }}
      >
        3
      </div>
    );
  }
  return (
    <span 
      className="font-bold text-lg"
      style={{ color: 'rgba(255, 215, 0, 0.7)' }}
    >
      {rank}
    </span>
  );
};

const TopRanking = ({ compact = false }: TopRankingProps) => {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const fetchTopUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, pending_reward, camly_balance, is_good_heart")
        .order("pending_reward", { ascending: false })
        .limit(20);

      if (error) throw error;

      const transformedUsers: TopUser[] = (data || []).map((user) => ({
        id: user.id,
        display_name: user.display_name || "Nông dân FUN",
        avatar_url: user.avatar_url,
        total_reward: (user.pending_reward || 0) + (user.camly_balance || 0),
        is_good_heart: user.is_good_heart || false,
      }));

      transformedUsers.sort((a, b) => b.total_reward - a.total_reward);
      setTopUsers(transformedUsers);
    } catch (error) {
      console.error("Error fetching top users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopUsers();
    const interval = setInterval(fetchTopUsers, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString("vi-VN");
  };

  const displayedUsers = showAll ? topUsers : topUsers.slice(0, 5);

  if (compact) {
    return (
      <div 
        className="relative overflow-hidden rounded-2xl cosmos-bg-compact p-4 animate-golden-glow"
        style={{
          border: '2px solid',
          borderImage: 'linear-gradient(135deg, hsl(50 100% 60%), hsl(40 100% 50%), hsl(50 100% 70%)) 1',
        }}
      >
        {/* Star field */}
        <div className="absolute inset-0 starfield" style={{ opacity: 0.6 }} />
        <SparkleParticles />
        
        <div className="relative z-10">
          <h3 
            className="text-center font-bold text-lg tracking-widest mb-3 animate-text-glow"
            style={{
              background: 'linear-gradient(90deg, #ffd700, #fff8dc, #ffd700)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            🏆 TOP RANKING 🏆
          </h3>
          
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center text-yellow-200/60 py-4">Đang tải...</div>
            ) : (
              displayedUsers.slice(0, 3).map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all hover:scale-[1.02]"
                  style={{
                    background: index === 0 
                      ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(0, 0, 0, 0.4))'
                      : 'rgba(0, 0, 0, 0.35)',
                    border: `1px solid ${index === 0 ? 'rgba(255, 215, 0, 0.5)' : 'rgba(255, 215, 0, 0.25)'}`,
                  }}
                >
                  <div className="w-5 flex justify-center">
                    <RankBadge rank={index + 1} />
                  </div>
                  <div className="relative">
                    <Avatar className="w-7 h-7 border border-yellow-400/50">
                      <AvatarImage src={user.avatar_url || funFarmLogo} />
                      <AvatarFallback className="bg-yellow-500/20 text-yellow-300 text-xs">
                        {user.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span 
                    className="flex-1 text-xs truncate"
                    style={{ color: 'rgba(255, 248, 220, 0.9)' }}
                  >
                    {user.display_name}
                  </span>
                  <div className="flex items-center gap-1">
                    <img src={camlyCoin} alt="" className="w-3 h-3" />
                    <span 
                      className="font-bold text-xs"
                      style={{ color: '#ffd700', textShadow: '0 0 6px rgba(255, 215, 0, 0.5)' }}
                    >
                      {formatNumber(user.total_reward)}
                    </span>
                  </div>
                </div>
              ))
            )}
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
        borderImage: 'linear-gradient(135deg, hsl(50 100% 65%), hsl(45 100% 55%), hsl(50 100% 70%), hsl(40 100% 50%)) 1',
      }}
    >
      {/* Star field */}
      <div className="absolute inset-0 starfield animate-float-star" style={{ opacity: 0.8 }} />
      <SparkleParticles />
      
      {/* Golden halo */}
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/15 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,215,0,0.2)_0%,transparent_60%)]" />
      
      {/* Corner ornaments */}
      <div className="absolute top-3 left-3 w-8 h-8"
        style={{ borderTop: '3px solid rgba(255, 215, 0, 0.8)', borderLeft: '3px solid rgba(255, 215, 0, 0.8)', borderRadius: '8px 0 0 0' }} />
      <div className="absolute top-3 right-3 w-8 h-8"
        style={{ borderTop: '3px solid rgba(255, 215, 0, 0.8)', borderRight: '3px solid rgba(255, 215, 0, 0.8)', borderRadius: '0 8px 0 0' }} />
      <div className="absolute bottom-3 left-3 w-8 h-8"
        style={{ borderBottom: '3px solid rgba(255, 215, 0, 0.8)', borderLeft: '3px solid rgba(255, 215, 0, 0.8)', borderRadius: '0 0 0 8px' }} />
      <div className="absolute bottom-3 right-3 w-8 h-8"
        style={{ borderBottom: '3px solid rgba(255, 215, 0, 0.8)', borderRight: '3px solid rgba(255, 215, 0, 0.8)', borderRadius: '0 0 8px 0' }} />

      {/* Twinkling stars */}
      <div className="absolute top-8 left-12 w-1.5 h-1.5 bg-white rounded-full animate-twinkle" />
      <div className="absolute top-20 right-10 w-1 h-1 bg-yellow-300 rounded-full animate-twinkle" style={{ animationDelay: '0.7s' }} />
      <div className="absolute bottom-24 left-8 w-2 h-2 bg-white rounded-full animate-twinkle-slow" style={{ animationDelay: '1.2s' }} />

      <div className="relative z-10">
        {/* Title */}
        <h2 
          className="text-center font-bold text-2xl md:text-3xl tracking-[0.2em] mb-6 animate-text-glow"
          style={{
            background: 'linear-gradient(90deg, #fff8dc, #ffd700, #fff8dc, #ffd700, #fff8dc)',
            backgroundSize: '200% 100%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          🏆 TOP RANKING 🏆
        </h2>

        {/* User List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center text-yellow-200/60 py-8">Đang tải bảng xếp hạng...</div>
          ) : topUsers.length === 0 ? (
            <div className="text-center text-yellow-200/60 py-8">Chưa có dữ liệu</div>
          ) : (
            displayedUsers.map((user, index) => (
              <div
                key={user.id}
                className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300 cursor-pointer group"
                style={{
                  background: index === 0 
                    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(0, 0, 0, 0.4))'
                    : index === 1
                    ? 'linear-gradient(135deg, rgba(192, 192, 192, 0.1), rgba(0, 0, 0, 0.4))'
                    : index === 2
                    ? 'linear-gradient(135deg, rgba(205, 127, 50, 0.1), rgba(0, 0, 0, 0.4))'
                    : 'rgba(0, 0, 0, 0.35)',
                  border: `1px solid ${
                    index === 0 ? 'rgba(255, 215, 0, 0.6)' 
                    : index === 1 ? 'rgba(192, 192, 192, 0.4)'
                    : index === 2 ? 'rgba(205, 127, 50, 0.4)'
                    : 'rgba(255, 215, 0, 0.25)'
                  }`,
                  boxShadow: index === 0 ? '0 0 20px rgba(255, 215, 0, 0.3)' : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(0, 0, 0, 0.5))';
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.4)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = index === 0 
                    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(0, 0, 0, 0.4))'
                    : index === 1
                    ? 'linear-gradient(135deg, rgba(192, 192, 192, 0.1), rgba(0, 0, 0, 0.4))'
                    : index === 2
                    ? 'linear-gradient(135deg, rgba(205, 127, 50, 0.1), rgba(0, 0, 0, 0.4))'
                    : 'rgba(0, 0, 0, 0.35)';
                  e.currentTarget.style.boxShadow = index === 0 ? '0 0 20px rgba(255, 215, 0, 0.3)' : 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {/* Rank */}
                <div className="w-8 flex justify-center">
                  <RankBadge rank={index + 1} />
                </div>

                {/* Avatar with laurel wreath */}
                <div className="relative w-14 h-14 flex items-center justify-center">
                  {index < 3 && <LaurelWreath rank={index + 1} />}
                  <Avatar 
                    className="relative w-10 h-10 z-10"
                    style={{
                      border: `2px solid ${
                        index === 0 ? '#ffd700' 
                        : index === 1 ? '#c0c0c0' 
                        : index === 2 ? '#cd7f32' 
                        : 'rgba(255, 215, 0, 0.4)'
                      }`,
                      boxShadow: index === 0 
                        ? '0 0 15px rgba(255, 215, 0, 0.6)' 
                        : index < 3 
                        ? '0 0 10px rgba(255, 215, 0, 0.3)'
                        : 'none',
                    }}
                  >
                    <AvatarImage src={user.avatar_url || funFarmLogo} />
                    <AvatarFallback className="bg-yellow-500/20 text-yellow-300 font-bold">
                      {user.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {user.is_good_heart && (
                    <div 
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs z-20"
                      style={{
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        border: '2px solid rgba(0, 50, 30, 0.8)',
                      }}
                    >
                      💚
                    </div>
                  )}
                </div>

                {/* Name */}
                <span 
                  className="flex-1 font-semibold truncate"
                  style={{ 
                    color: 'rgba(255, 248, 220, 0.95)',
                    textShadow: index === 0 ? '0 0 8px rgba(255, 215, 0, 0.4)' : 'none',
                  }}
                >
                  {user.display_name}
                </span>

                {/* Reward with coin */}
                <div className="flex items-center gap-2">
                  <img 
                    src={camlyCoin} 
                    alt="CAMLY" 
                    className={`w-5 h-5 ${index === 0 ? 'animate-coin-spin' : ''}`}
                    style={{ filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))' }}
                  />
                  <span 
                    className={`font-bold text-lg ${index === 0 ? 'animate-text-glow' : ''}`}
                    style={{
                      background: index === 0 
                        ? 'linear-gradient(90deg, #ffd700, #fff, #ffd700)' 
                        : 'linear-gradient(90deg, #ffd700, #fff8dc)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {formatNumber(user.total_reward)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* View Full Leaderboard Button */}
        <Button
          variant="ghost"
          className="w-full mt-4 transition-all duration-300 hover:scale-[1.02] gap-2"
          style={{
            color: '#ffd700',
            border: '1px solid rgba(255, 215, 0, 0.4)',
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(0, 0, 0, 0.3))',
          }}
          onClick={() => window.location.href = '/leaderboard'}
        >
          <Trophy className="w-4 h-4" />
          Xem Bảng Xếp Hạng Đầy Đủ
        </Button>
      </div>
    </div>
  );
};

export default TopRanking;
