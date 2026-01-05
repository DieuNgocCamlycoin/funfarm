// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Top Ranking - Bảng xếp hạng gọn gàng với khung nguyệt quế

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
        filter: `drop-shadow(0 0 ${8 * intensity}px rgba(255, 215, 0, ${0.6 * intensity}))`,
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
        fill={rank === 1 ? '#dc143c' : rank === 2 ? '#4169e1' : rank === 3 ? '#32cd32' : '#ffd700'}
        style={{
          filter: `drop-shadow(0 0 4px ${rank === 1 ? 'rgba(220, 20, 60, 0.8)' : rank === 2 ? 'rgba(65, 105, 225, 0.8)' : rank === 3 ? 'rgba(50, 205, 50, 0.8)' : 'rgba(255, 215, 0, 0.8)'})`,
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
        filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 1))',
      }}
    >
      <defs>
        <linearGradient id="starGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffec8b" />
          <stop offset="50%" stopColor="#ffd700" />
          <stop offset="100%" stopColor="#daa520" />
        </linearGradient>
      </defs>
      <path 
        d="M12 2 L14.5 8.5 L21 9.5 L16 14 L17.5 21 L12 17.5 L6.5 21 L8 14 L3 9.5 L9.5 8.5 Z" 
        fill="url(#starGold)"
        stroke="#b8860b"
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
    1: { bg: 'linear-gradient(135deg, #ffd700, #ffec8b)', border: '#b8860b', text: '#5c4a00' },
    2: { bg: 'linear-gradient(135deg, #c0c0c0, #e8e8e8)', border: '#a9a9a9', text: '#4a4a4a' },
    3: { bg: 'linear-gradient(135deg, #cd7f32, #daa06d)', border: '#8b4513', text: '#4a2800' },
  };
  const style = colors[rank as keyof typeof colors] || { bg: 'linear-gradient(135deg, #3a5a40, #4a7a50)', border: '#2d4a32', text: '#ffffff' };
  
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
      className="relative overflow-hidden rounded-2xl p-[2px]"
      style={{
        background: 'linear-gradient(135deg, #ffd700 0%, #b8860b 50%, #ffd700 100%)',
        boxShadow: '0 4px 20px rgba(255, 215, 0, 0.4)',
      }}
    >
      {/* Inner container */}
      <div 
        className="relative overflow-hidden rounded-[14px]"
        style={{
          background: 'linear-gradient(160deg, #1a472a 0%, #0d3320 50%, #0a2818 100%)',
        }}
      >
        {/* Subtle glow */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(255, 215, 0, 0.15) 0%, transparent 60%)',
          }}
        />

        <div className={`relative z-10 ${compact ? 'p-3' : 'p-4'}`}>
          {/* Title */}
          <h2 
            className={`text-center font-bold ${compact ? 'text-base' : 'text-lg'} tracking-wider mb-3`}
            style={{
              color: '#ffd700',
              textShadow: '0 0 10px rgba(255, 215, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.5)',
            }}
          >
            ⭐ TOP RANKING ⭐
          </h2>

          {/* User List - Compact Rows */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-yellow-400/80 text-sm">
                Đang tải...
              </div>
            ) : topUsers.length === 0 ? (
              <div className="text-center py-4 text-yellow-400/80 text-sm">
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
                    className="flex items-center gap-3 p-2 rounded-xl transition-all duration-200 cursor-pointer hover:bg-white/5"
                    style={{
                      background: isTop3 
                        ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.08) 0%, transparent 100%)'
                        : 'transparent',
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
                          border: `2px solid ${isTop3 ? '#ffd700' : 'rgba(255, 215, 0, 0.5)'}`,
                        }}
                      >
                        <AvatarImage src={user.avatar_url || ""} alt={user.display_name} />
                        <AvatarFallback 
                          className="text-xs font-bold"
                          style={{ 
                            background: 'linear-gradient(135deg, #2d5a3d, #1a472a)',
                            color: '#ffd700',
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
                        className="font-semibold text-sm truncate"
                        style={{ 
                          color: isTop3 ? '#ffd700' : '#e8e8e8',
                          textShadow: isTop3 ? '0 0 8px rgba(255, 215, 0, 0.5)' : 'none',
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
                className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 text-xs px-4"
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
      </div>
    </div>
  );
};

export default TopRanking;
