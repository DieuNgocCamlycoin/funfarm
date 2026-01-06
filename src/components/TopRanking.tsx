// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Top Ranking - Bảng xếp hạng sang trọng đẳng cấp vũ trụ - Design đồng bộ với Honor Board

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import camlyCoin from "@/assets/camly_coin.png";
import top1Frame from "@/assets/top1-frame.png";
import top2Frame from "@/assets/top2-frame.png";
import top3Frame from "@/assets/top3-frame.png";
import top4Frame from "@/assets/top4-frame.png";
import top5Frame from "@/assets/top5-frame.png";
import glassFrame from "@/assets/honor-board/glass-frame.png";
import statRowBg from "@/assets/honor-board/stat-row-bg.png";

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

// Frame Component - 5 khung riêng cho Top 5
const LaurelFrame = ({ rank }: { rank: number }) => {
  const frameImages: Record<number, string> = {
    1: top1Frame,
    2: top2Frame,
    3: top3Frame,
    4: top4Frame,
    5: top5Frame,
  };
  
  const frameImage = frameImages[rank] || top5Frame;
  
  const glowColors: Record<number, string> = {
    1: 'rgba(251, 191, 36, 1)',
    2: 'rgba(156, 163, 175, 0.9)',
    3: 'rgba(217, 119, 6, 0.9)',
    4: 'rgba(34, 197, 94, 0.9)',
    5: 'rgba(168, 85, 247, 0.9)',
  };
  
  const glowSize = rank === 1 ? 18 : 12;
  const glowColor = glowColors[rank] || glowColors[5];
  
  return (
    <div 
      className="absolute inset-0 flex items-center justify-center"
      style={{
        filter: `drop-shadow(0 0 ${glowSize}px ${glowColor})`,
      }}
    >
      <img 
        src={frameImage} 
        alt="frame" 
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
};

// Rank Badge
const RankBadge = ({ rank }: { rank: number }) => {
  const colors = {
    1: { bg: 'linear-gradient(135deg, #fbbf24, #fef3c7)', border: '#b45309', text: '#78350f' },
    2: { bg: 'linear-gradient(135deg, #9ca3af, #e5e7eb)', border: '#6b7280', text: '#374151' },
    3: { bg: 'linear-gradient(135deg, #d97706, #fcd34d)', border: '#92400e', text: '#78350f' },
  };
  const style = colors[rank as keyof typeof colors] || { bg: 'linear-gradient(135deg, #059669, #34d399)', border: '#047857', text: '#ffffff' };
  
  return (
    <div 
      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-20"
      style={{
        background: style.bg,
        border: `2px solid ${style.border}`,
        color: style.text,
        boxShadow: `0 2px 8px rgba(0,0,0,0.4)`,
        fontSize: '11px',
      }}
    >
      {rank}
    </div>
  );
};

const TopRanking = ({ compact = false }: TopRankingProps) => {
  const navigate = useNavigate();
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

  const displayedUsers = showAll ? topUsers.slice(0, 10) : topUsers.slice(0, 5);

  return (
    <div 
      className="relative overflow-hidden rounded-2xl"
      data-angel-perch="ranking"
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
        <div className="absolute top-4 right-8 w-2 h-2 bg-white rounded-full animate-ping opacity-70" style={{ animationDuration: '3s' }} />
        <div className="absolute top-20 left-6 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-ping opacity-60" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
        <div className="absolute bottom-32 right-1/4 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-50" style={{ animationDuration: '4s', animationDelay: '1s' }} />
      </div>

      <div className={`relative z-10 ${compact ? 'p-4' : 'p-5'}`}>
        {/* Title - 2 ngôi sao với animation */}
        <div className="relative mb-5">
          <span 
            className="absolute left-2 top-0 text-2xl"
            style={{ 
              filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.9))',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            ⭐
          </span>
          
          <span 
            className="absolute right-2 top-0 text-2xl"
            style={{ 
              filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.9))',
              animation: 'pulse 2s ease-in-out infinite',
              animationDelay: '1s',
            }}
          >
            ⭐
          </span>
          
          {/* Chữ TOP RANKING */}
          <div 
            className="text-center"
            style={{ 
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 900,
              color: '#ffd700',
              textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 25px rgba(255,215,0,0.7)',
              letterSpacing: '0.15em',
            }}
          >
            <div style={{ fontSize: compact ? '1.8rem' : '2.2rem', lineHeight: 1.1 }}>
              TOP
            </div>
            <div style={{ fontSize: compact ? '1.8rem' : '2.2rem', lineHeight: 1.1 }}>
              RANKING
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="space-y-2.5">
          {isLoading ? (
            <div className="text-center py-4 text-sm font-medium" style={{ color: '#fbbf24', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              Đang tải...
            </div>
          ) : topUsers.length === 0 ? (
            <div className="text-center py-4 text-sm font-medium" style={{ color: '#fbbf24', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              Chưa có dữ liệu
            </div>
          ) : (
            displayedUsers.map((user, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              
              return (
                <div
                  key={user.id}
                  onClick={() => navigate(`/user/${user.id}`)}
                  className="relative flex items-center gap-2 cursor-pointer transition-all duration-200 hover:brightness-110"
                  style={{ height: rank === 1 ? '100px' : '92px' }}
                >
                  {/* Green background from stat-row-bg */}
                  <img 
                    src={statRowBg}
                    alt=""
                    className="absolute inset-0 w-full h-full object-fill rounded-lg"
                    style={{
                      filter: isTop3 ? 'brightness(0.85)' : 'brightness(1)',
                    }}
                  />
                  
                  {/* Content overlay */}
                  <div className="relative z-10 flex items-center gap-2 w-full p-2">
                    {/* Avatar with Frame */}
                    <div 
                      className="relative flex-shrink-0"
                      style={{ 
                        width: rank === 1 ? 140 : 130, 
                        height: rank === 1 ? 100 : 92,
                      }}
                    >
                      <LaurelFrame rank={rank} />
                      <Avatar 
                        className="absolute rounded-full"
                        style={{ 
                          width: rank === 1 ? 48 : 44, 
                          height: rank === 1 ? 48 : 44, 
                          top: '42%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          border: `2px solid ${isTop3 ? '#fbbf24' : 'rgba(251, 191, 36, 0.5)'}`,
                          boxShadow: isTop3 ? '0 0 8px rgba(251, 191, 36, 0.5)' : 'none',
                        }}
                      >
                        <AvatarImage src={user.avatar_url || ""} alt={user.display_name} />
                        <AvatarFallback 
                          className="text-sm font-bold"
                          style={{ 
                            background: 'linear-gradient(135deg, #059669, #047857)',
                            color: '#fbbf24',
                          }}
                        >
                          {user.display_name?.charAt(0)?.toUpperCase() || "F"}
                        </AvatarFallback>
                      </Avatar>
                      {rank > 5 && <RankBadge rank={rank} />}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0 text-right">
                      <div 
                        className="font-bold truncate"
                        style={{ 
                          fontSize: '1rem',
                          color: isTop3 ? '#ffd700' : '#ffffff',
                          textShadow: isTop3 
                            ? '0 2px 4px rgba(0,0,0,0.9), 0 0 15px rgba(251, 191, 36, 0.7)' 
                            : '0 2px 4px rgba(0,0,0,0.9)',
                        }}
                      >
                        {user.display_name}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        <img src={camlyCoin} alt="CAMLY" className="w-5 h-5" />
                        <span 
                          className="font-extrabold"
                          style={{ 
                            fontSize: '1rem',
                            color: '#fbbf24',
                            textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 12px rgba(251, 191, 36, 0.8)',
                          }}
                        >
                          {formatNumber(user.total_reward)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Divider */}
        <div className="mt-4 mb-3 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* View More / View Less Button */}
        {topUsers.length > 5 && (
          <div className="flex justify-center mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="hover:bg-white/15 text-sm px-5 font-semibold"
              style={{ color: '#fbbf24', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
            >
              {showAll ? 'Thu gọn ↑' : 'Xem thêm ↓'}
            </Button>
          </div>
        )}

        {/* Full Leaderboard Link */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/leaderboard")}
            className="text-white border-emerald-400/70 bg-emerald-800/50 hover:bg-emerald-700/60 hover:text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-all"
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            }}
          >
            Bảng xếp hạng đầy đủ →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TopRanking;
