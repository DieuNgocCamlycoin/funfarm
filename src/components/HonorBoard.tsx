// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Honor Board - Bảng vinh danh thành tựu cộng đồng

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, Image, Video, Coins } from "lucide-react";
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
      // Fetch total users
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch total posts
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });

      // Fetch posts with images/videos for counting
      const { data: postsWithMedia } = await supabase
        .from("posts")
        .select("images, video_url");

      let totalPhotos = 0;
      let totalVideos = 0;

      postsWithMedia?.forEach((post) => {
        if (post.images && Array.isArray(post.images)) {
          totalPhotos += post.images.length;
        }
        if (post.video_url) {
          totalVideos += 1;
        }
      });

      // Fetch total rewards (pending + balance)
      const { data: rewardsData } = await supabase
        .from("profiles")
        .select("pending_reward, camly_balance");

      const totalReward = rewardsData?.reduce((sum, profile) => {
        return sum + (profile.pending_reward || 0) + (profile.camly_balance || 0);
      }, 0) || 0;

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

    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString("vi-VN");
  };

  const statItems = [
    { icon: Users, label: "TOTAL USERS", value: stats.totalUsers, color: "text-yellow-400" },
    { icon: FileText, label: "TOTAL POSTS", value: stats.totalPosts, color: "text-yellow-400" },
    { icon: Image, label: "TOTAL PHOTOS", value: stats.totalPhotos, color: "text-yellow-400" },
    { icon: Video, label: "TOTAL VIDEOS", value: stats.totalVideos, color: "text-yellow-400" },
    { icon: Coins, label: "TOTAL REWARD", value: stats.totalReward, color: "text-yellow-400" },
  ];

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-2xl border-2 border-yellow-500/50 bg-gradient-to-br from-emerald-900/90 via-teal-900/90 to-emerald-950/90 p-4 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
        {/* Sparkle effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,215,0,0.1)_0%,transparent_50%)]" />
        <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400/10 rounded-full blur-xl" />
        
        <div className="relative z-10">
          <h3 className="text-center font-bold text-lg bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 bg-clip-text text-transparent mb-3 tracking-wide">
            ✨ HONOR BOARD ✨
          </h3>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            {statItems.slice(0, 4).map((item) => (
              <div key={item.label} className="flex items-center gap-2 bg-black/30 rounded-lg px-2 py-1.5 border border-yellow-500/30">
                <item.icon className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-100/80 truncate">{item.label.split(' ')[1]}</span>
                <span className="ml-auto font-bold text-yellow-300">{formatNumber(item.value)}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-2 flex items-center justify-center gap-2 bg-black/30 rounded-lg px-3 py-2 border border-yellow-500/30">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-100/80">REWARD</span>
            <span className="font-bold text-yellow-300">{formatNumber(stats.totalReward)}</span>
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.2)_0%,transparent_60%)]" />
      
      {/* Animated sparkles */}
      <div className="absolute top-4 left-8 w-2 h-2 bg-yellow-300 rounded-full animate-pulse opacity-60" />
      <div className="absolute top-12 right-10 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-16 left-12 w-2 h-2 bg-yellow-400 rounded-full animate-pulse opacity-40" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-8 right-6 w-1 h-1 bg-yellow-100 rounded-full animate-pulse opacity-70" style={{ animationDelay: '1.5s' }} />

      <div className="relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src={funFarmLogo}
            alt="FUN FARM Web3"
            className="w-16 h-16 rounded-full border-2 border-yellow-400/60 shadow-[0_0_20px_rgba(234,179,8,0.5)]"
          />
        </div>

        {/* Title */}
        <h2 className="text-center font-bold text-2xl md:text-3xl bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent mb-6 tracking-widest drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
          ✨ HONOR BOARD ✨
        </h2>

        {/* Stats */}
        <div className="space-y-3">
          {statItems.map((item, index) => (
            <div
              key={item.label}
              className="flex items-center gap-4 bg-gradient-to-r from-black/40 via-black/30 to-black/40 rounded-xl px-4 py-3 border border-yellow-500/40 hover:border-yellow-400/60 transition-all hover:shadow-[0_0_15px_rgba(234,179,8,0.3)]"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 border border-yellow-400/40">
                <item.icon className="w-5 h-5 text-yellow-400" />
              </div>
              <span className="font-semibold text-yellow-100/90 tracking-wide flex-1">
                {item.label}
              </span>
              <span className="font-bold text-xl bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                {isLoading ? "..." : formatNumber(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HonorBoard;
