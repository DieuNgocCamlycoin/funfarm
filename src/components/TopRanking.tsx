// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Top Ranking - Bảng xếp hạng gọn gàng - Design đồng bộ với HonorBoard

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import camlyCoin from "@/assets/camly_coin.png";
import honorBoardBg from "@/assets/honor-board-bg.jpeg";

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

// Styles - đồng bộ với HonorBoard
const goldTextStyle = "text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]";
const titleGoldStyle = "text-transparent bg-clip-text bg-gradient-to-b from-yellow-50 via-amber-200 to-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]";

// Laurel Frame - Khung vòng nguyệt quế kim loại vàng
const LaurelFrame = ({ rank }: { rank: number }) => {
  const intensity = rank === 1 ? 1 : rank === 2 ? 0.85 : rank === 3 ? 0.75 : 0.6;
  const size = 56;
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 56 56" 
      className="absolute inset-0"
      style={{
        filter: `drop-shadow(0 0 ${8 * intensity}px rgba(251, 191, 36, ${0.6 * intensity}))`,
      }}
    >
      <defs>
        <linearGradient id={`laurelGrad${rank}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={`hsl(45, 100%, ${75 + intensity * 10}%)`} />
          <stop offset="50%" stopColor={`hsl(45, 100%, ${55 + intensity * 10}%)`} />
          <stop offset="100%" stopColor={`hsl(40, 90%, ${45 + intensity * 10}%)`} />
        </linearGradient>
      </defs>
      
      {/* Left laurel branch */}
      <g transform="translate(2, 28) rotate(-10)">
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse
            key={`left-${i}`}
            cx={4}
            cy={-8 - i * 5}
            rx={3}
            ry={6}
            fill={`url(#laurelGrad${rank})`}
            transform={`rotate(${20 + i * 8})`}
            opacity={0.9 - i * 0.1}
          />
        ))}
      </g>
      
      {/* Right laurel branch */}
      <g transform="translate(54, 28) rotate(10)">
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse
            key={`right-${i}`}
            cx={-4}
            cy={-8 - i * 5}
            rx={3}
            ry={6}
            fill={`url(#laurelGrad${rank})`}
            transform={`rotate(${-20 - i * 8})`}
            opacity={0.9 - i * 0.1}
          />
        ))}
      </g>
      
      {/* Bottom ribbon */}
      <ellipse 
        cx={28} 
        cy={52} 
        rx={8} 
        ry={3} 
        fill={`url(#laurelGrad${rank})`}
        opacity={0.8}
      />
      
      {/* Top gem/connector */}
      <circle 
        cx={28} 
        cy={4} 
        r={3} 
        fill={rank === 1 ? '#dc143c' : rank === 2 ? '#4169e1' : rank === 3 ? '#32cd32' : '#fbbf24'}
        style={{
          filter: `drop-shadow(0 0 4px ${rank === 1 ? 'rgba(220, 20, 60, 0.8)' : rank === 2 ? 'rgba(65, 105, 225, 0.8)' : rank === 3 ? 'rgba(50, 205, 50, 0.8)' : 'rgba(251, 191, 36, 0.8)'})`,
        }}
      />
    </svg>
  );
};

// Star Crown - Ngôi sao vương miện cho Top 1
const StarCrown = () => {
  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      className="absolute -top-3 left-1/2 -translate-x-1/2 z-20"
      style={{
        filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 1))',
      }}
    >
      <defs>
        <linearGradient id="starGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path 
        d="M12 2 L14.5 8.5 L21 9.5 L16 14 L17.5 21 L12 17.5 L6.5 21 L8 14 L3 9.5 L9.5 8.5 Z" 
        fill="url(#starGold)"
        stroke="#b45309"
        strokeWidth="0.5"
      />
      {/* Center gem */}
      <circle cx="12" cy="11" r="2" fill="#dc143c" opacity="0.9">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
};

// Rank Badge - Huy hiệu thứ hạng nhỏ gọn
const RankBadge = ({ rank }: { rank: number }) => {
  const colors = {
    1: { bg: 'linear-gradient(135deg, #fbbf24, #fef3c7)', border: '#b45309', text: '#78350f' },
    2: { bg: 'linear-gradient(135deg, #9ca3af, #e5e7eb)', border: '#6b7280', text: '#374151' },
    3: { bg: 'linear-gradient(135deg, #d97706, #fcd34d)', border: '#92400e', text: '#78350f' },
  };
  const style = colors[rank as keyof typeof colors] || { bg: 'linear-gradient(135deg, #059669, #34d399)', border: '#047857', text: '#ffffff' };
  
  return (
    <div 
      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold z-20"
      style={{
        background: style.bg,
        border: `1.5px solid ${style.border}`,
        color: style.text,
        boxShadow: `0 2px 6px rgba(0,0,0,0.3)`,
        fontSize: '10px',
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
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toLocaleString("vi-VN");
  };

  const displayedUsers = showAll ? topUsers.slice(0, 10) : topUsers.slice(0, 5);

  return (
    <div 
      className="relative overflow-hidden rounded-xl border-2 border-amber-400/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_20px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.25)]"
    >
      {/* Background image - giống HonorBoard */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${honorBoardBg})` }}
      />
      <div className="absolute inset-0 bg-black/10" />
      
      {/* Sparkle effects - giống HonorBoard */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-3 left-6 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-60" style={{ animationDuration: '3s' }} />
        <div className="absolute top-8 right-10 w-1 h-1 bg-yellow-200 rounded-full animate-ping opacity-50" style={{ animationDuration: '2.5s', animationDelay: '0.7s' }} />
        <div className="absolute bottom-10 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-40" style={{ animationDuration: '4s', animationDelay: '1.2s' }} />
        <div className="absolute top-1/2 right-6 w-1 h-1 bg-amber-300 rounded-full animate-ping opacity-40" style={{ animationDuration: '3.5s', animationDelay: '2s' }} />
        <div className="absolute bottom-6 right-1/3 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-50" style={{ animationDuration: '2.8s', animationDelay: '0.5s' }} />
      </div>
      
      {/* Top highlight - giống HonorBoard */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

      <div className={`relative z-10 ${compact ? 'p-3' : 'p-4'}`}>
        {/* Title - giống style HonorBoard */}
        <h2 
          className="uppercase relative text-center whitespace-nowrap mb-4"
          style={{ 
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 900,
            fontSize: compact ? '1.2rem' : '1.4rem',
            color: '#ffe135',
            textShadow: '0 1px 3px rgba(0,0,0,0.4), 0 0 12px rgba(255,225,53,0.5)',
            letterSpacing: '0.12em',
          }}
        >
          ⭐ TOP RANKING ⭐
        </h2>

        {/* User List - Compact Rows */}
        <div className="space-y-2">
          {isLoading ? (
            <div className={`text-center py-4 text-sm font-medium ${goldTextStyle}`}>
              Đang tải...
            </div>
          ) : topUsers.length === 0 ? (
            <div className={`text-center py-4 text-sm font-medium ${goldTextStyle}`}>
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
                  className="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 cursor-pointer hover:bg-white/10 bg-black/20 border border-amber-300/30 backdrop-blur-[2px]"
                  style={{
                    boxShadow: isTop3 
                      ? 'inset 0 1px 0 rgba(255,255,255,0.15), 0 0 10px rgba(251,191,36,0.2)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                >
                  {/* Avatar with Laurel Frame */}
                  <div className="relative flex-shrink-0" style={{ width: 56, height: 56 }}>
                    {rank === 1 && <StarCrown />}
                    <LaurelFrame rank={rank} />
                    <Avatar 
                      className="absolute"
                      style={{ 
                        width: 40, 
                        height: 40, 
                        top: 8, 
                        left: 8,
                        border: `2px solid ${isTop3 ? '#fbbf24' : 'rgba(251, 191, 36, 0.5)'}`,
                      }}
                    >
                      <AvatarImage src={user.avatar_url || ""} alt={user.display_name} />
                      <AvatarFallback 
                        className="text-xs font-bold"
                        style={{ 
                          background: 'linear-gradient(135deg, #059669, #047857)',
                          color: '#fbbf24',
                        }}
                      >
                        {user.display_name?.charAt(0)?.toUpperCase() || "F"}
                      </AvatarFallback>
                    </Avatar>
                    <RankBadge rank={rank} />
                  </div>

                  {/* User Info - 2 rows */}
                  <div className="flex-1 min-w-0">
                    <div 
                      className={`font-semibold text-sm truncate ${isTop3 ? titleGoldStyle : 'text-white'}`}
                      style={{ 
                        textShadow: isTop3 ? '0 0 8px rgba(251, 191, 36, 0.5)' : 'none',
                      }}
                    >
                      {user.display_name}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <img src={camlyCoin} alt="CAMLY" className="w-4 h-4" />
                      <span 
                        className="font-bold text-sm"
                        style={{ 
                          color: '#4ade80',
                          textShadow: '0 0 6px rgba(74, 222, 128, 0.5)',
                        }}
                      >
                        {formatNumber(user.total_reward)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* View More / View Less Button */}
        {topUsers.length > 5 && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className={`${goldTextStyle} hover:bg-amber-400/10 text-xs px-4`}
            >
              {showAll ? 'Thu gọn ↑' : 'Xem thêm ↓'}
            </Button>
          </div>
        )}

        {/* Full Leaderboard Link */}
        <div className="mt-2 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/leaderboard")}
            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 text-xs"
          >
            Bảng xếp hạng đầy đủ →
          </Button>
        </div>
      </div>

      {/* Bottom edge - giống HonorBoard */}
      <div className="relative z-10 h-1.5 bg-gradient-to-r from-emerald-600/30 via-amber-400/60 to-emerald-600/30" />
    </div>
  );
};

export default TopRanking;
