// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Top Ranking - Bảng xếp hạng sang trọng đẳng cấp vũ trụ

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Award } from "lucide-react";
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

const RankBadge = ({ rank }: { rank: number }) => {
  return <span className={`ff-rank-medal ff-rank-${Math.min(rank, 4)}`}>{rank}</span>;
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
    <div className="ff-luxury-panel ff-ranking-panel relative overflow-hidden rounded-2xl" data-angel-perch="ranking">

      <div className={`relative z-10 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="mb-4 flex items-center justify-center gap-2.5">
          <Award className="h-5 w-5 text-[#bd8b18]" />
          <h2 className="ff-premium-gold-text text-xl font-black tracking-[0.12em]">TOP RANKING</h2>
        </div>

        {/* User List - Compact Rows */}
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
              return (
                <div
                  key={user.id}
                  onClick={() => navigate(`/user/${user.id}`)}
                  className="ff-compact-rank-row flex items-center gap-2.5 px-3 py-2 cursor-pointer"
                >
                  <RankBadge rank={rank} />
                  <Avatar className="h-10 w-10 shrink-0 rounded-full border border-[#e2c46f]">
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

                  {/* User Info - căn phải */}
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-bold text-white">
                      {user.display_name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <img src={camlyCoin} alt="CAMLY" className="w-4 h-4" />
                      <span className="ff-clean-gold-text text-sm font-extrabold tabular-nums">
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
        <div className="my-3 h-px bg-emerald-900/10" />

        {/* View More / View Less Button */}
        {topUsers.length > 5 && (
          <div className="flex justify-center mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="px-5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              {showAll ? 'Thu gọn ↑' : 'Xem thêm ↓'}
            </Button>
          </div>
        )}

        {/* Full Leaderboard Link - Premium Golden Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/leaderboard")}
            className="ff-ranking-link flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold"
          >
            <span>🏆</span>
            <span>Bảng xếp hạng đầy đủ</span>
          </Button>
        </div>
      </div>

    </div>
  );
};

export default TopRanking;
