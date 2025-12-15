// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Leaderboard - Bảng xếp hạng đầy đủ với filter thời gian

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Crown, ArrowLeft, Trophy, Medal, Star, TrendingUp, Users, FileText, MessageCircle, Share2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import funFarmLogo from "@/assets/logo_fun_farm_web3.png";
import camlyCoin from "@/assets/camly_coin.png";

interface LeaderboardUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_reward: number;
  is_good_heart: boolean;
  profile_type: string;
  reputation_score: number;
  created_at: string;
}

interface UserStats {
  postsCount: number;
  commentsCount: number;
  sharesCount: number;
  likesReceived: number;
}

type TimeFilter = "all" | "week" | "month" | "year";

// Sparkle particles component
const SparkleParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
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
              background: p.id % 3 === 0 ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 255, 255, 0.8)',
              boxShadow: '0 0 4px rgba(255, 215, 0, 0.6)',
            }}
          />
        </div>
      ))}
    </div>
  );
};

// Rank badge component
const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return (
      <div className="relative flex items-center justify-center w-10 h-10">
        <Crown className="w-8 h-8 text-yellow-400 animate-pulse" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))' }} />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
        style={{ background: 'linear-gradient(135deg, #c0c0c0, #e8e8e8)', color: '#333', boxShadow: '0 0 8px rgba(192, 192, 192, 0.6)' }}>
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
        style={{ background: 'linear-gradient(135deg, #cd7f32, #daa520)', color: '#fff', boxShadow: '0 0 8px rgba(205, 127, 50, 0.6)' }}>
        3
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
      style={{ background: 'rgba(255, 215, 0, 0.15)', color: 'rgba(255, 215, 0, 0.8)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
      {rank}
    </div>
  );
};

// Profile type badge
const ProfileTypeBadge = ({ type }: { type: string }) => {
  const typeMap: Record<string, { label: string; emoji: string }> = {
    farmer: { label: "Nông dân", emoji: "🌾" },
    fisher: { label: "Ngư dân", emoji: "🐟" },
    eater: { label: "Người mua", emoji: "🍽️" },
    restaurant: { label: "Nhà hàng", emoji: "🏪" },
    distributor: { label: "Phân phối", emoji: "🚛" },
    shipper: { label: "Shipper", emoji: "🛵" },
  };
  const info = typeMap[type] || { label: type, emoji: "👤" };
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{ background: 'rgba(255, 215, 0, 0.15)', color: 'rgba(255, 248, 220, 0.9)' }}>
      {info.emoji} {info.label}
    </span>
  );
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fetchLeaderboard = async (filter: TimeFilter) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, pending_reward, camly_balance, is_good_heart, profile_type, reputation_score, created_at")
        .order("pending_reward", { ascending: false })
        .limit(100);

      // Filter by time if needed
      if (filter !== "all") {
        const now = new Date();
        let startDate: Date;
        
        switch (filter) {
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "month":
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case "year":
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte("created_at", startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const transformedUsers: LeaderboardUser[] = (data || []).map((user) => ({
        id: user.id,
        display_name: user.display_name || "Nông dân FUN",
        avatar_url: user.avatar_url,
        total_reward: (user.pending_reward || 0) + (user.camly_balance || 0),
        is_good_heart: user.is_good_heart || false,
        profile_type: user.profile_type || "eater",
        reputation_score: user.reputation_score || 0,
        created_at: user.created_at,
      }));

      transformedUsers.sort((a, b) => b.total_reward - a.total_reward);
      setUsers(transformedUsers);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserStats = async (userId: string) => {
    setIsLoadingStats(true);
    try {
      const [postsRes, commentsRes, sharesRes, likesRes] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("author_id", userId),
        supabase.from("post_shares").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("post_likes").select("post_id").eq("user_id", userId),
      ]);

      // Count likes received on user's posts
      const { data: userPosts } = await supabase.from("posts").select("id").eq("author_id", userId);
      let likesReceived = 0;
      if (userPosts && userPosts.length > 0) {
        const postIds = userPosts.map(p => p.id);
        const { count } = await supabase.from("post_likes").select("id", { count: "exact", head: true }).in("post_id", postIds);
        likesReceived = count || 0;
      }

      setUserStats({
        postsCount: postsRes.count || 0,
        commentsCount: commentsRes.count || 0,
        sharesCount: sharesRes.count || 0,
        likesReceived,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(timeFilter);
  }, [timeFilter]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserStats(selectedUser.id);
    }
  }, [selectedUser]);

  const formatNumber = (num: number): string => num.toLocaleString("vi-VN");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Button>

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl cosmos-bg p-8 mb-8 animate-golden-glow"
          style={{ border: '4px solid', borderImage: 'linear-gradient(135deg, hsl(50 100% 65%), hsl(45 100% 55%), hsl(50 100% 70%)) 1' }}>
          <div className="absolute inset-0 starfield animate-float-star" style={{ opacity: 0.8 }} />
          <SparkleParticles />
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/15 via-transparent to-transparent" />
          
          {/* Corner ornaments */}
          <div className="absolute top-3 left-3 w-10 h-10" style={{ borderTop: '3px solid rgba(255, 215, 0, 0.8)', borderLeft: '3px solid rgba(255, 215, 0, 0.8)', borderRadius: '8px 0 0 0' }} />
          <div className="absolute top-3 right-3 w-10 h-10" style={{ borderTop: '3px solid rgba(255, 215, 0, 0.8)', borderRight: '3px solid rgba(255, 215, 0, 0.8)', borderRadius: '0 8px 0 0' }} />
          <div className="absolute bottom-3 left-3 w-10 h-10" style={{ borderBottom: '3px solid rgba(255, 215, 0, 0.8)', borderLeft: '3px solid rgba(255, 215, 0, 0.8)', borderRadius: '0 0 0 8px' }} />
          <div className="absolute bottom-3 right-3 w-10 h-10" style={{ borderBottom: '3px solid rgba(255, 215, 0, 0.8)', borderRight: '3px solid rgba(255, 215, 0, 0.8)', borderRadius: '0 0 8px 0' }} />

          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
              style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.1))', border: '2px solid rgba(255, 215, 0, 0.5)' }}>
              <Trophy className="w-10 h-10 text-yellow-400" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))' }} />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-widest mb-2 animate-text-glow"
              style={{ background: 'linear-gradient(90deg, #fff8dc, #ffd700, #fff8dc)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🏆 BẢNG XẾP HẠNG 🏆
            </h1>
            <p className="text-yellow-100/80">Vinh danh những bà con đóng góp tích cực cho cộng đồng FUN FARM</p>
          </div>
        </div>

        {/* Time filter tabs */}
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)} className="mb-6">
          <TabsList className="grid grid-cols-4 w-full max-w-md mx-auto"
            style={{ background: 'linear-gradient(135deg, rgba(0, 50, 50, 0.9), rgba(0, 30, 60, 0.9))', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
            <TabsTrigger value="all" className="data-[state=active]:bg-yellow-500/30 data-[state=active]:text-yellow-300">
              Tất cả
            </TabsTrigger>
            <TabsTrigger value="week" className="data-[state=active]:bg-yellow-500/30 data-[state=active]:text-yellow-300">
              Tuần
            </TabsTrigger>
            <TabsTrigger value="month" className="data-[state=active]:bg-yellow-500/30 data-[state=active]:text-yellow-300">
              Tháng
            </TabsTrigger>
            <TabsTrigger value="year" className="data-[state=active]:bg-yellow-500/30 data-[state=active]:text-yellow-300">
              Năm
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Leaderboard list */}
        <div className="relative overflow-hidden rounded-3xl cosmos-bg p-6 animate-golden-glow"
          style={{ border: '3px solid', borderImage: 'linear-gradient(135deg, hsl(50 100% 60%), hsl(40 100% 50%)) 1' }}>
          <div className="absolute inset-0 starfield" style={{ opacity: 0.6 }} />
          <SparkleParticles />
          
          <div className="relative z-10">
            {/* Stats summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                <Users className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                <div className="text-2xl font-bold text-yellow-300">{formatNumber(users.length)}</div>
                <div className="text-xs text-yellow-100/70">Thành viên</div>
              </div>
              <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                <Crown className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                <div className="text-2xl font-bold text-yellow-300">{users.filter(u => u.is_good_heart).length}</div>
                <div className="text-xs text-yellow-100/70">Good Heart</div>
              </div>
              <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                <div className="text-2xl font-bold text-yellow-300">
                  {formatNumber(users.reduce((sum, u) => sum + u.total_reward, 0))}
                </div>
                <div className="text-xs text-yellow-100/70">Tổng CAMLY</div>
              </div>
              <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                <Star className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                <div className="text-2xl font-bold text-yellow-300">
                  {users.length > 0 ? formatNumber(Math.round(users.reduce((sum, u) => sum + u.reputation_score, 0) / users.length)) : 0}
                </div>
                <div className="text-xs text-yellow-100/70">Điểm TB</div>
              </div>
            </div>

            {/* User list */}
            {isLoading ? (
              <div className="text-center py-12 text-yellow-200/60">Đang tải bảng xếp hạng...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-yellow-200/60">Chưa có dữ liệu trong khoảng thời gian này</div>
            ) : (
              <div className="space-y-3">
                {users.map((user, index) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="flex items-center gap-4 rounded-xl px-4 py-3 cursor-pointer transition-all duration-300"
                    style={{
                      background: index === 0 
                        ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(0, 0, 0, 0.4))'
                        : index < 3
                        ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(0, 0, 0, 0.4))'
                        : 'rgba(0, 0, 0, 0.35)',
                      border: `1px solid ${index === 0 ? 'rgba(255, 215, 0, 0.6)' : 'rgba(255, 215, 0, 0.25)'}`,
                      boxShadow: index === 0 ? '0 0 20px rgba(255, 215, 0, 0.3)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(0, 0, 0, 0.5))';
                      e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.4)';
                      e.currentTarget.style.transform = 'scale(1.01)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = index === 0 
                        ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(0, 0, 0, 0.4))'
                        : index < 3
                        ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(0, 0, 0, 0.4))'
                        : 'rgba(0, 0, 0, 0.35)';
                      e.currentTarget.style.boxShadow = index === 0 ? '0 0 20px rgba(255, 215, 0, 0.3)' : 'none';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <RankBadge rank={index + 1} />
                    
                    <div className="relative">
                      <Avatar className="w-12 h-12"
                        style={{
                          border: `2px solid ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'rgba(255, 215, 0, 0.4)'}`,
                          boxShadow: index < 3 ? '0 0 10px rgba(255, 215, 0, 0.4)' : 'none',
                        }}>
                        <AvatarImage src={user.avatar_url || funFarmLogo} />
                        <AvatarFallback className="bg-yellow-500/20 text-yellow-300 font-bold">
                          {user.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {user.is_good_heart && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: '2px solid rgba(0, 50, 30, 0.8)' }}>
                          💚
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate" style={{ color: 'rgba(255, 248, 220, 0.95)' }}>
                          {user.display_name}
                        </span>
                        <ProfileTypeBadge type={user.profile_type} />
                      </div>
                      <div className="text-xs text-yellow-100/60 mt-0.5">
                        Điểm uy tín: {user.reputation_score}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <img src={camlyCoin} alt="CAMLY" className={`w-6 h-6 ${index === 0 ? 'animate-coin-spin' : ''}`}
                        style={{ filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))' }} />
                      <span className={`font-bold text-lg ${index === 0 ? 'animate-text-glow' : ''}`}
                        style={{ background: 'linear-gradient(90deg, #ffd700, #fff8dc)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {formatNumber(user.total_reward)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User detail modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md cosmos-bg border-2"
          style={{ borderImage: 'linear-gradient(135deg, hsl(50 100% 60%), hsl(40 100% 50%)) 1' }}>
          <div className="absolute inset-0 starfield rounded-lg" style={{ opacity: 0.4 }} />
          
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-center animate-text-glow"
              style={{ background: 'linear-gradient(90deg, #ffd700, #fff8dc)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ⭐ Chi tiết thành tựu ⭐
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="relative z-10 space-y-4">
              {/* User info */}
              <div className="flex items-center gap-4 p-4 rounded-xl"
                style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                <Avatar className="w-16 h-16" style={{ border: '2px solid rgba(255, 215, 0, 0.5)' }}>
                  <AvatarImage src={selectedUser.avatar_url || funFarmLogo} />
                  <AvatarFallback className="bg-yellow-500/20 text-yellow-300 font-bold text-xl">
                    {selectedUser.display_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-lg" style={{ color: 'rgba(255, 248, 220, 0.95)' }}>
                    {selectedUser.display_name}
                  </div>
                  <ProfileTypeBadge type={selectedUser.profile_type} />
                  {selectedUser.is_good_heart && (
                    <span className="ml-2 text-green-400 text-sm">💚 Good Heart</span>
                  )}
                </div>
              </div>

              {/* Total reward */}
              <div className="text-center p-4 rounded-xl"
                style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(0, 0, 0, 0.4))', border: '1px solid rgba(255, 215, 0, 0.4)' }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <img src={camlyCoin} alt="CAMLY" className="w-8 h-8 animate-coin-spin" />
                  <span className="text-3xl font-bold animate-text-glow"
                    style={{ background: 'linear-gradient(90deg, #ffd700, #fff)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {formatNumber(selectedUser.total_reward)}
                  </span>
                </div>
                <div className="text-yellow-100/70 text-sm">Tổng CAMLY tích lũy</div>
              </div>

              {/* Stats grid */}
              {isLoadingStats ? (
                <div className="text-center py-4 text-yellow-200/60">Đang tải thống kê...</div>
              ) : userStats && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                    <FileText className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
                    <div className="text-xl font-bold text-yellow-300">{userStats.postsCount}</div>
                    <div className="text-xs text-yellow-100/70">Bài viết</div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                    <MessageCircle className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
                    <div className="text-xl font-bold text-yellow-300">{userStats.commentsCount}</div>
                    <div className="text-xs text-yellow-100/70">Bình luận</div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                    <Share2 className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
                    <div className="text-xl font-bold text-yellow-300">{userStats.sharesCount}</div>
                    <div className="text-xs text-yellow-100/70">Chia sẻ</div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                    <Star className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
                    <div className="text-xl font-bold text-yellow-300">{userStats.likesReceived}</div>
                    <div className="text-xs text-yellow-100/70">Lượt thích nhận</div>
                  </div>
                </div>
              )}

              {/* View profile button */}
              <Button 
                onClick={() => { setSelectedUser(null); navigate(`/user/${selectedUser.id}`); }}
                className="w-full"
                style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.1))', border: '1px solid rgba(255, 215, 0, 0.5)', color: '#ffd700' }}>
                Xem trang cá nhân
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leaderboard;
