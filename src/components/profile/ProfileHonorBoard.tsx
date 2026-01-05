// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoFunFarm from "@/assets/logo_fun_farm_web3.png";

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
  claimable: number; // pending_reward + approved_reward
  claimed: number; // camly_balance (đã rút về ví)
  totalReceived: number; // Tiền nhận từ user khác qua wallet_transactions
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
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  return <span>{formatNumber(displayValue)}{suffix}</span>;
};

// Stat item component
const StatItem = ({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) => (
  <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-emerald-900/50 border border-emerald-500/20 min-w-[70px]">
    <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wider drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]">
      {label}
    </span>
    <span className="text-sm font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
      <AnimatedNumber value={value} suffix={suffix} />
    </span>
  </div>
);

// Full-width stat row
const FullWidthStat = ({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) => (
  <div className={`flex justify-between items-center p-2 rounded-lg ${highlight ? 'bg-gradient-to-r from-amber-900/50 via-emerald-900/50 to-amber-900/50 border border-amber-500/30' : 'bg-emerald-900/50 border border-emerald-500/20'}`}>
    <span className="text-xs font-medium text-amber-400 uppercase tracking-wider drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]">
      {label}
    </span>
    <span className={`text-sm font-bold ${highlight ? 'text-amber-300' : 'text-white'} drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`}>
      <AnimatedNumber value={value} suffix=" CLC" />
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
        // Fetch all stats in parallel for performance
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
          // Posts count (only original posts, không đếm shares)
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', userId)
            .neq('post_type', 'share'),
          
          // Reactions count (likes user gave)
          supabase
            .from('post_likes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          
          // Comments count (comments user made)
          supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', userId),
          
          // Shares count (shares user made)
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', userId)
            .eq('post_type', 'share'),
          
          // Friends count (as follower)
          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', userId)
            .eq('status', 'accepted'),
          
          // Friends count (as following)
          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', userId)
            .eq('status', 'accepted'),
          
          // Profile data for claimable/claimed
          supabase
            .from('profiles')
            .select('pending_reward, approved_reward, camly_balance')
            .eq('id', userId)
            .single(),
          
          // Total received from wallet_transactions
          supabase
            .from('wallet_transactions')
            .select('amount')
            .eq('receiver_id', userId)
            .eq('status', 'completed')
        ]);

        const pendingReward = profileResult.data?.pending_reward || 0;
        const approvedReward = profileResult.data?.approved_reward || 0;
        const camlyBalance = profileResult.data?.camly_balance || 0;
        
        // Calculate total received from other users
        const totalReceived = (receivedResult.data || []).reduce(
          (sum, tx) => sum + (tx.amount || 0), 0
        );

        setStats({
          postsCount: postsResult.count || 0,
          reactionsCount: reactionsResult.count || 0,
          commentsCount: commentsResult.count || 0,
          sharesCount: sharesResult.count || 0,
          friendsCount: (friendsResult1.count || 0) + (friendsResult2.count || 0),
          nftsCount: 0, // NFTs chưa có trong schema
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
    <div className="relative w-full max-w-[320px] overflow-hidden rounded-xl backdrop-blur-md bg-black/40 border border-amber-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2),0_0_60px_rgba(251,191,36,0.1)]">
      {/* Decorative glow effects */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 px-3 py-2 border-b border-amber-500/30 bg-gradient-to-r from-emerald-900/30 via-black/20 to-emerald-900/30">
        {/* Logo + Title */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="relative">
            <img 
              src={logoFunFarm} 
              alt="FUN FARM" 
              className="w-6 h-6 rounded-full drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
            />
            <div className="absolute inset-0 rounded-full animate-pulse bg-emerald-500/30" />
          </div>
          <h2 className="text-sm font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            HONOR BOARD
          </h2>
        </div>
        
        {/* User Avatar + Name */}
        <div className="flex items-center justify-center gap-2">
          <Avatar className="w-5 h-5 border border-amber-500/50">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-[8px] bg-emerald-900/50">
              {(displayName || 'U')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-white/90 truncate max-w-[150px]">
            {displayName || 'FUN Farmer'}
          </span>
        </div>
      </div>

      {/* Stats Content */}
      <div className="relative z-10 p-3 space-y-2">
        {/* Two columns grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Left Column */}
          <div className="space-y-1.5">
            <StatItem label="Posts" value={stats.postsCount} />
            <StatItem label="Reactions" value={stats.reactionsCount} />
            <StatItem label="Comments" value={stats.commentsCount} />
            <StatItem label="Shares" value={stats.sharesCount} />
          </div>
          
          {/* Right Column */}
          <div className="space-y-1.5">
            <StatItem label="Friends" value={stats.friendsCount} />
            <StatItem label="NFTs" value={stats.nftsCount} />
            <StatItem label="Claimable" value={stats.claimable} />
            <StatItem label="Claimed" value={stats.claimed} />
          </div>
        </div>

        {/* Full-width totals */}
        <div className="space-y-1.5 pt-1">
          <FullWidthStat label="Total Reward" value={totalReward} />
          <FullWidthStat label="Total Money" value={totalMoney} highlight />
        </div>
      </div>

      {/* Bottom decorative line */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
    </div>
  );
};

export default ProfileHonorBoard;
