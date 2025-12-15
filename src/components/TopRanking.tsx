// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Top Ranking - Bảng xếp hạng người dùng lương thiện

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown, ChevronDown, ChevronUp, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import funFarmLogo from "@/assets/logo_fun_farm_web3.png";

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

      // Sort by total reward
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

    // Refresh every 5 minutes
    const interval = setInterval(fetchTopUsers, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString("vi-VN");
  };

  const displayedUsers = showAll ? topUsers : topUsers.slice(0, 5);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.8)]" />;
    if (index === 1) return <Star className="w-4 h-4 text-gray-300" />;
    if (index === 2) return <Star className="w-4 h-4 text-amber-600" />;
    return null;
  };

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-2xl border-2 border-yellow-500/50 bg-gradient-to-br from-emerald-900/90 via-teal-900/90 to-emerald-950/90 p-4 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
        {/* Sparkle effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,215,0,0.1)_0%,transparent_50%)]" />
        
        <div className="relative z-10">
          <h3 className="text-center font-bold text-lg bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent mb-3 tracking-wide">
            🏆 TOP RANKING 🏆
          </h3>
          
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center text-yellow-200/60 py-4">Đang tải...</div>
            ) : (
              displayedUsers.slice(0, 3).map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 bg-black/30 rounded-lg px-2 py-1.5 border border-yellow-500/30"
                >
                  <span className="w-5 text-center font-bold text-yellow-400 text-sm">
                    {index + 1}
                  </span>
                  <Avatar className="w-7 h-7 border border-yellow-400/50">
                    <AvatarImage src={user.avatar_url || funFarmLogo} />
                    <AvatarFallback className="bg-yellow-500/20 text-yellow-300 text-xs">
                      {user.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-yellow-100/90 text-xs truncate">
                    {user.display_name}
                  </span>
                  <span className="font-bold text-yellow-300 text-xs">
                    {formatNumber(user.total_reward)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border-4 border-yellow-500/60 bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 p-6 shadow-[0_0_60px_rgba(234,179,8,0.4)]">
      {/* Golden corner decorations */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-yellow-400/80 rounded-tl-3xl" />
      <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-yellow-400/80 rounded-tr-3xl" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-yellow-400/80 rounded-bl-3xl" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-yellow-400/80 rounded-br-3xl" />
      
      {/* Sparkle overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,215,0,0.15)_0%,transparent_60%)]" />
      
      {/* Animated sparkles */}
      <div className="absolute top-6 left-10 w-2 h-2 bg-yellow-300 rounded-full animate-pulse opacity-60" />
      <div className="absolute top-20 right-8 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.7s' }} />
      <div className="absolute bottom-20 left-6 w-2 h-2 bg-yellow-400 rounded-full animate-pulse opacity-40" style={{ animationDelay: '1.2s' }} />

      <div className="relative z-10">
        {/* Title */}
        <h2 className="text-center font-bold text-2xl md:text-3xl bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent mb-6 tracking-widest drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
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
                className={`flex items-center gap-4 bg-gradient-to-r from-black/40 via-black/30 to-black/40 rounded-xl px-4 py-3 border transition-all hover:shadow-[0_0_15px_rgba(234,179,8,0.3)] ${
                  index === 0
                    ? "border-yellow-400/70 shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                    : index === 1
                    ? "border-gray-400/50"
                    : index === 2
                    ? "border-amber-600/50"
                    : "border-yellow-500/30"
                }`}
              >
                {/* Rank */}
                <div className="w-8 flex justify-center">
                  {getRankIcon(index) || (
                    <span className="font-bold text-yellow-400/80">{index + 1}</span>
                  )}
                </div>

                {/* Avatar with laurel wreath effect */}
                <div className="relative">
                  <div className={`absolute -inset-1.5 rounded-full ${
                    index === 0
                      ? "bg-gradient-to-br from-yellow-400/40 to-yellow-600/40 animate-pulse"
                      : index === 1
                      ? "bg-gradient-to-br from-gray-300/30 to-gray-400/30"
                      : index === 2
                      ? "bg-gradient-to-br from-amber-500/30 to-amber-700/30"
                      : ""
                  }`} />
                  <Avatar className={`relative w-12 h-12 border-2 ${
                    index === 0
                      ? "border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.6)]"
                      : index === 1
                      ? "border-gray-300"
                      : index === 2
                      ? "border-amber-600"
                      : "border-yellow-500/50"
                  }`}>
                    <AvatarImage src={user.avatar_url || funFarmLogo} />
                    <AvatarFallback className="bg-yellow-500/20 text-yellow-300 font-bold">
                      {user.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {user.is_good_heart && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs border-2 border-emerald-900">
                      💚
                    </div>
                  )}
                </div>

                {/* Name */}
                <span className="flex-1 font-semibold text-yellow-100/90 truncate">
                  {user.display_name}
                </span>

                {/* Reward */}
                <span className={`font-bold text-lg ${
                  index === 0
                    ? "bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent"
                    : "text-yellow-300"
                }`}>
                  {formatNumber(user.total_reward)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Show More Button */}
        {topUsers.length > 5 && (
          <Button
            variant="ghost"
            className="w-full mt-4 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 border border-yellow-500/30"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Thu gọn
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Xem Top 20
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TopRanking;
