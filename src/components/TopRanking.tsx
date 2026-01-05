// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Top Ranking - Bảng xếp hạng sang trọng đẳng cấp vũ trụ

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

// Frame Component - 5 khung riêng cho Top 5
const LaurelFrame = ({ rank }: { rank: number }) => {
  // Chọn khung theo từng hạng
  const frameImages: Record<number, string> = {
    1: top1Frame,  // Khung vàng phượng hoàng
    2: top2Frame,  // Khung bạc
    3: top3Frame,  // Khung đồng
    4: top4Frame,  // Khung xanh lá
    5: top5Frame,  // Khung tím
  };
  
  const frameImage = frameImages[rank] || top5Frame;
  
  // Drop-shadow phù hợp với màu sắc từng khung
  const glowColors: Record<number, string> = {
    1: 'rgba(251, 191, 36, 1)',     // Vàng sáng
    2: 'rgba(156, 163, 175, 0.9)',  // Bạc
    3: 'rgba(217, 119, 6, 0.9)',    // Đồng
    4: 'rgba(34, 197, 94, 0.9)',    // Xanh lá
    5: 'rgba(168, 85, 247, 0.9)',   // Tím
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

  // Hiển thị số đầy đủ, không rút gọn
  const formatNumber = (num: number): string => {
    return num.toLocaleString("vi-VN");
  };

  const displayedUsers = showAll ? topUsers.slice(0, 10) : topUsers.slice(0, 5);

  return (
    <div 
      className="relative overflow-hidden rounded-xl border border-white/40"
      data-angel-perch="ranking"
      style={{
        background: 'linear-gradient(135deg, rgba(120,200,255,0.12) 0%, rgba(255,255,255,0.08) 30%, rgba(180,220,255,0.15) 70%, rgba(255,255,255,0.1) 100%)',
        backdropFilter: 'saturate(120%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.15), 0 0 1px rgba(255,255,255,0.8)',
      }}
    >
      {/* Top highlight - Liquid Glass edge */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      <div className={`relative z-10 ${compact ? 'p-3' : 'p-4'}`}>
        {/* Title - 2 vương miện cố định 2 góc với animation, chữ TOP = RANKING */}
        <div className="relative mb-5">
          {/* Ngôi sao trái - animation glow pulse */}
          <span 
            className="absolute left-2 top-0 text-2xl"
            style={{ 
              filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.9))',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            ⭐
          </span>
          
          {/* Ngôi sao phải - animation glow pulse */}
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
          
          {/* Chữ TOP RANKING - 2 hàng, căn giữa, cùng kích thước */}
          <div 
            className="text-center"
            style={{ 
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 900,
              color: '#ffe135',
              textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 15px rgba(255,225,53,0.6)',
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

        {/* User List - Compact Rows */}
        <div className="space-y-2.5">
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
                  className="flex items-center gap-2 p-2.5 rounded-lg transition-all duration-200 cursor-pointer hover:brightness-110 border border-white/35"
                  style={{
                    background: isTop3 
                      ? 'rgba(5, 150, 105, 0.35)'
                      : 'rgba(16, 185, 129, 0.25)',
                    boxShadow: isTop3 
                      ? 'inset 0 1px 0 rgba(255,255,255,0.25), 0 0 12px rgba(16,185,129,0.3)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  {/* Avatar with Frame - khung lớn hơn, sát mép trái */}
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
                    {/* Ẩn RankBadge cho Top 1-5 vì khung đã có badge */}
                    {rank > 5 && <RankBadge rank={rank} />}
                  </div>

                  {/* User Info - căn phải */}
                  <div className="flex-1 min-w-0 text-right">
                    <div 
                      className={`font-bold truncate ${isTop3 ? titleGoldStyle : 'text-white'}`}
                      style={{ 
                        fontSize: '1rem',
                        textShadow: isTop3 ? '0 0 10px rgba(251, 191, 36, 0.6)' : '0 1px 2px rgba(0,0,0,0.5)',
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
                          textShadow: '0 0 8px rgba(251, 191, 36, 0.6), 0 1px 2px rgba(0,0,0,0.5)',
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

        {/* Divider */}
        <div className="mt-4 mb-3 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* View More / View Less Button */}
        {topUsers.length > 5 && (
          <div className="flex justify-center mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className={`${goldTextStyle} hover:bg-white/15 text-sm px-5 font-semibold`}
            >
              {showAll ? 'Thu gọn ↑' : 'Xem thêm ↓'}
            </Button>
          </div>
        )}

        {/* Full Leaderboard Link - nổi bật */}
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

      {/* Bottom edge - Liquid Glass */}
      <div className="relative z-10 h-1.5 bg-gradient-to-r from-white/10 via-white/30 to-white/10" />
    </div>
  );
};

export default TopRanking;
