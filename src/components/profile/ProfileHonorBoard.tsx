// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  TrendingUp, 
  Users, 
  Star, 
  MessageCircle, 
  Share2, 
  Gift, 
  Coins, 
  DollarSign,
  Wallet
} from "lucide-react";
import logoFunFarm from "@/assets/logo_fun_farm_web3.png";
import honorBoardBg from "@/assets/honor-board-bg.jpeg";

interface ProfileHonorBoardProps {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface ProfileStats {
  postsCount: number;
  reactionsCount: number;
  commentsCount: number;
  sharesCount: number;
  friendsCount: number;
  nftsCount: number;
  claimable: number;
  claimed: number;
  totalReceived: number;
}

// Animated counter component
const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepDuration);
    
    return () => clearInterval(timer);
  }, [value]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'K';
    }
    return num.toLocaleString();
  };

  return <span>{formatNumber(displayValue)}{suffix}</span>;
};

// Stat row component with icon
const StatRow = ({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number;
}) => (
  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-900/40 border border-emerald-500/20 hover:bg-emerald-800/50 transition-colors">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-amber-400" />
      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
        {label}
      </span>
    </div>
    <span className="text-sm font-bold text-white tabular-nums">
      <AnimatedNumber value={value} />
    </span>
  </div>
);

// Full-width stat row for totals
const TotalRow = ({ 
  icon: Icon, 
  label, 
  value,
  highlight = false 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number;
  highlight?: boolean;
}) => (
  <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
    highlight 
      ? 'bg-gradient-to-r from-amber-900/50 via-emerald-900/40 to-amber-900/50 border-amber-500/40' 
      : 'bg-emerald-900/40 border-emerald-500/20'
  }`}>
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${highlight ? 'text-amber-300' : 'text-amber-400'}`} />
      <span className={`text-xs font-semibold uppercase tracking-wide ${highlight ? 'text-amber-300' : 'text-amber-400'}`}>
        {label}
      </span>
    </div>
    <span className={`text-sm font-bold tabular-nums ${highlight ? 'text-amber-200' : 'text-white'}`}>
      <AnimatedNumber value={value} />
    </span>
  </div>
);

const ProfileHonorBoard = ({ userId, displayName, avatarUrl }: ProfileHonorBoardProps) => {
  const [stats, setStats] = useState<ProfileStats>({
    postsCount: 0,
    reactionsCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    friendsCount: 0,
    nftsCount: 0,
    claimable: 0,
    claimed: 0,
    totalReceived: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        const [
          postsResult,
          reactionsResult,
          commentsResult,
          sharesResult,
          friendsResult1,
          friendsResult2,
          profileResult,
          receivedResult
        ] = await Promise.all([
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', userId)
            .neq('post_type', 'share'),
          
          supabase
            .from('post_likes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          
          supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', userId),
          
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', userId)
            .eq('post_type', 'share'),
          
          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', userId)
            .eq('status', 'accepted'),
          
          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', userId)
            .eq('status', 'accepted'),
          
          supabase
            .from('profiles')
            .select('pending_reward, approved_reward, camly_balance')
            .eq('id', userId)
            .single(),
          
          supabase
            .from('wallet_transactions')
            .select('amount')
            .eq('receiver_id', userId)
            .eq('status', 'completed')
        ]);

        const pendingReward = profileResult.data?.pending_reward || 0;
        const approvedReward = profileResult.data?.approved_reward || 0;
        const camlyBalance = profileResult.data?.camly_balance || 0;
        
        const totalReceived = (receivedResult.data || []).reduce(
          (sum, tx) => sum + (tx.amount || 0), 0
        );

        setStats({
          postsCount: postsResult.count || 0,
          reactionsCount: reactionsResult.count || 0,
          commentsCount: commentsResult.count || 0,
          sharesCount: sharesResult.count || 0,
          friendsCount: (friendsResult1.count || 0) + (friendsResult2.count || 0),
          nftsCount: 0,
          claimable: pendingReward + approvedReward,
          claimed: camlyBalance,
          totalReceived,
        });
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  const totalReward = stats.claimable + stats.claimed;
  const totalMoney = totalReward + stats.totalReceived;

  return (
    <div className="relative w-full max-w-[500px] overflow-hidden rounded-xl border-2 border-amber-500/60 shadow-[0_0_40px_rgba(16,185,129,0.3),0_0_80px_rgba(251,191,36,0.15)]">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${honorBoardBg})` }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
      
      {/* Content */}
      <div className="relative z-10 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          {/* Logo + Title */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <img 
                src={logoFunFarm} 
                alt="FUN FARM" 
                className="w-10 h-10 rounded-full drop-shadow-[0_0_12px_rgba(16,185,129,0.9)] border border-emerald-400/50"
              />
              <div className="absolute inset-0 rounded-full animate-pulse bg-emerald-400/20" />
            </div>
            <h2 
              className="text-xl font-bold tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.7)]"
              style={{ fontFamily: "'Orbitron', 'Segoe UI', sans-serif" }}
            >
              HONOR BOARD
            </h2>
          </div>
          
          {/* User Avatar + Name */}
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full border border-amber-500/30">
            <Avatar className="w-6 h-6 border border-amber-500/50">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-xs bg-emerald-900/70 text-amber-400">
                {(displayName || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-white truncate max-w-[120px]">
              {displayName || 'FUN Farmer'}
            </span>
          </div>
        </div>

        {/* Stats Grid - 2 columns horizontal */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {/* Left Column */}
          <div className="space-y-1.5">
            <StatRow icon={TrendingUp} label="POSTS" value={stats.postsCount} />
            <StatRow icon={Star} label="REACTIONS" value={stats.reactionsCount} />
            <StatRow icon={MessageCircle} label="COMMENTS" value={stats.commentsCount} />
            <StatRow icon={Share2} label="SHARES" value={stats.sharesCount} />
          </div>
          
          {/* Right Column */}
          <div className="space-y-1.5">
            <StatRow icon={Users} label="FRIENDS" value={stats.friendsCount} />
            <StatRow icon={Gift} label="NFTS" value={stats.nftsCount} />
            <StatRow icon={Coins} label="CLAIMABLE" value={stats.claimable} />
            <StatRow icon={Wallet} label="CLAIMED" value={stats.claimed} />
          </div>
        </div>

        {/* Full-width totals */}
        <div className="space-y-1.5">
          <TotalRow icon={DollarSign} label="TOTAL REWARD" value={totalReward} />
          <TotalRow icon={Wallet} label="TOTAL MONEY" value={totalMoney} highlight />
        </div>
      </div>

      {/* Bottom decorative gradient line */}
      <div className="relative z-10 h-1 bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />
    </div>
  );
};

export default ProfileHonorBoard;
