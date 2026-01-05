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
  Wallet,
  ArrowUp,
  ArrowDown
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
  reactionsGiven: number;
  reactionsReceived: number;
  commentsGiven: number;
  commentsReceived: number;
  sharesGiven: number;
  sharesReceived: number;
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

// Stat row with given/received breakdown
const StatRowDouble = ({ 
  icon: Icon, 
  label, 
  given,
  received
}: { 
  icon: React.ElementType; 
  label: string; 
  given: number;
  received: number;
}) => (
  <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-emerald-900/40 border border-emerald-500/20 hover:bg-emerald-800/50 transition-colors">
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">
        {label}
      </span>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 text-emerald-300">
        <ArrowUp className="w-3 h-3" />
        <span className="text-xs font-bold tabular-nums">
          <AnimatedNumber value={given} />
        </span>
      </div>
      <div className="flex items-center gap-0.5 text-amber-300">
        <ArrowDown className="w-3 h-3" />
        <span className="text-xs font-bold tabular-nums">
          <AnimatedNumber value={received} />
        </span>
      </div>
    </div>
  </div>
);

// Simple stat row with icon
const StatRow = ({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number;
}) => (
  <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-emerald-900/40 border border-emerald-500/20 hover:bg-emerald-800/50 transition-colors">
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">
        {label}
      </span>
    </div>
    <span className="text-xs font-bold text-white tabular-nums">
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
  <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border ${
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
    reactionsGiven: 0,
    reactionsReceived: 0,
    commentsGiven: 0,
    commentsReceived: 0,
    sharesGiven: 0,
    sharesReceived: 0,
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
        // First get user's post IDs for counting received interactions
        const { data: userPosts } = await supabase
          .from('posts')
          .select('id')
          .eq('author_id', userId);
        
        const userPostIds = (userPosts || []).map(p => p.id);

        const [
          postsResult,
          reactionsGivenResult,
          reactionsReceivedResult,
          commentsGivenResult,
          commentsReceivedResult,
          sharesGivenResult,
          sharesReceivedResult,
          friendsResult1,
          friendsResult2,
          profileResult,
          receivedResult
        ] = await Promise.all([
          // Posts count (only original posts)
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', userId)
            .neq('post_type', 'share'),
          
          // Reactions given (likes user gave to others)
          supabase
            .from('post_likes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          
          // Reactions received (likes on user's posts)
          userPostIds.length > 0
            ? supabase
                .from('post_likes')
                .select('id', { count: 'exact', head: true })
                .in('post_id', userPostIds)
            : Promise.resolve({ count: 0 }),
          
          // Comments given (comments user made)
          supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', userId),
          
          // Comments received (comments on user's posts)
          userPostIds.length > 0
            ? supabase
                .from('comments')
                .select('id', { count: 'exact', head: true })
                .in('post_id', userPostIds)
            : Promise.resolve({ count: 0 }),
          
          // Shares given (shares user made)
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', userId)
            .eq('post_type', 'share'),
          
          // Shares received (others sharing user's posts)
          userPostIds.length > 0
            ? supabase
                .from('posts')
                .select('id', { count: 'exact', head: true })
                .in('original_post_id', userPostIds)
                .eq('post_type', 'share')
            : Promise.resolve({ count: 0 }),
          
          // Friends as follower
          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', userId)
            .eq('status', 'accepted'),
          
          // Friends as following
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
            .maybeSingle(),
          
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
        
        const totalReceived = (receivedResult.data || []).reduce(
          (sum, tx) => sum + (tx.amount || 0), 0
        );

        setStats({
          postsCount: postsResult.count || 0,
          reactionsGiven: reactionsGivenResult.count || 0,
          reactionsReceived: (reactionsReceivedResult as any).count || 0,
          commentsGiven: commentsGivenResult.count || 0,
          commentsReceived: (commentsReceivedResult as any).count || 0,
          sharesGiven: sharesGivenResult.count || 0,
          sharesReceived: (sharesReceivedResult as any).count || 0,
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
    <div className="relative w-full max-w-[480px] overflow-hidden rounded-xl border-2 border-amber-500/60 shadow-[0_0_40px_rgba(16,185,129,0.3),0_0_80px_rgba(251,191,36,0.15)]">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${honorBoardBg})` }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
      
      {/* Content */}
      <div className="relative z-10 p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          {/* Logo + Title */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <img 
                src={logoFunFarm} 
                alt="FUN FARM" 
                className="w-8 h-8 rounded-full drop-shadow-[0_0_12px_rgba(16,185,129,0.9)] border border-emerald-400/50"
              />
              <div className="absolute inset-0 rounded-full animate-pulse bg-emerald-400/20" />
            </div>
            <h2 
              className="text-lg font-bold tracking-[0.12em] text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.7)]"
              style={{ fontFamily: "'Orbitron', 'Segoe UI', sans-serif" }}
            >
              HONOR BOARD
            </h2>
          </div>
          
          {/* User Avatar + Name */}
          <div className="flex items-center gap-2 bg-black/30 px-2 py-1 rounded-full border border-amber-500/30">
            <Avatar className="w-5 h-5 border border-amber-500/50">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-[10px] bg-emerald-900/70 text-amber-400">
                {(displayName || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-white truncate max-w-[100px]">
              {displayName || 'FUN Farmer'}
            </span>
          </div>
        </div>

        {/* Legend for arrows */}
        <div className="flex justify-end gap-3 mb-1.5 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-0.5 text-emerald-300">
            <ArrowUp className="w-2.5 h-2.5" /> Đã tương tác
          </span>
          <span className="flex items-center gap-0.5 text-amber-300">
            <ArrowDown className="w-2.5 h-2.5" /> Được nhận
          </span>
        </div>

        {/* Stats Grid - 2 columns */}
        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
          {/* Left Column */}
          <div className="space-y-1">
            <StatRow icon={TrendingUp} label="POSTS" value={stats.postsCount} />
            <StatRowDouble icon={Star} label="REACTIONS" given={stats.reactionsGiven} received={stats.reactionsReceived} />
            <StatRowDouble icon={MessageCircle} label="COMMENTS" given={stats.commentsGiven} received={stats.commentsReceived} />
            <StatRowDouble icon={Share2} label="SHARES" given={stats.sharesGiven} received={stats.sharesReceived} />
          </div>
          
          {/* Right Column */}
          <div className="space-y-1">
            <StatRow icon={Users} label="FRIENDS" value={stats.friendsCount} />
            <StatRow icon={Gift} label="NFTS" value={stats.nftsCount} />
            <StatRow icon={Coins} label="CLAIMABLE" value={stats.claimable} />
            <StatRow icon={Wallet} label="CLAIMED" value={stats.claimed} />
          </div>
        </div>

        {/* Full-width totals */}
        <div className="space-y-1">
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
