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

// Animated counter component - now shows full numbers
const AnimatedNumber = ({ value, suffix = "", fullNumber = false }: { value: number; suffix?: string; fullNumber?: boolean }) => {
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
    if (fullNumber) {
      return num.toLocaleString('vi-VN');
    }
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

// Metallic gold text style - sharper and more luxurious
const goldTextStyle = "text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]";

// Title gold style - bigger and bolder
const titleGoldStyle = "text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-200 to-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]";

// Metallic frame style - brighter emerald metallic
const metallicFrameStyle = "bg-gradient-to-b from-emerald-500/85 via-emerald-600/90 to-emerald-700/85 border border-emerald-300/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.4)] backdrop-blur-sm";

// Golden metallic frame for Total Money
const goldenFrameStyle = "bg-gradient-to-r from-amber-500/95 via-yellow-400/95 to-amber-500/95 border-2 border-yellow-200/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2),0_4px_12px_rgba(251,191,36,0.6),0_0_30px_rgba(251,191,36,0.4)] backdrop-blur-sm";

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
  <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg ${metallicFrameStyle} hover:border-amber-300/80 transition-all`}>
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 ${goldTextStyle}`} style={{ filter: 'drop-shadow(0 0 2px rgba(251,191,36,0.5))' }} />
      <span className={`text-[10px] font-bold uppercase tracking-wide ${goldTextStyle}`}>
        {label}
      </span>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        <ArrowUp className="w-3 h-3 text-emerald-300" />
        <span className="text-xs font-bold text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
          <AnimatedNumber value={given} />
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <ArrowDown className="w-3 h-3 text-amber-300" />
        <span className="text-xs font-bold text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
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
  <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg ${metallicFrameStyle} hover:border-amber-300/80 transition-all`}>
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 ${goldTextStyle}`} style={{ filter: 'drop-shadow(0 0 2px rgba(251,191,36,0.5))' }} />
      <span className={`text-[10px] font-bold uppercase tracking-wide ${goldTextStyle}`}>
        {label}
      </span>
    </div>
    <span className="text-xs font-bold text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
      <AnimatedNumber value={value} />
    </span>
  </div>
);

// Full-width stat row for totals with breakdown
const TotalRow = ({ 
  icon: Icon, 
  label, 
  value,
  subLabel,
  highlight = false,
  fullNumber = false
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number;
  subLabel?: string;
  highlight?: boolean;
  fullNumber?: boolean;
}) => (
  <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${
    highlight ? goldenFrameStyle : metallicFrameStyle
  } relative overflow-hidden`}>
    {/* Sparkle effect for highlighted */}
    {highlight && (
      <>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
          style={{ backgroundSize: '200% 100%' }} />
        <div className="absolute top-0 left-1/4 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute bottom-1 right-1/3 w-0.5 h-0.5 bg-yellow-200 rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
      </>
    )}
    <div className="flex flex-col gap-0.5 relative z-10">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${highlight ? 'text-amber-900' : goldTextStyle}`} style={{ filter: highlight ? 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' : 'drop-shadow(0 0 3px rgba(251,191,36,0.6))' }} />
        <span className={`text-sm font-extrabold uppercase tracking-wide ${highlight ? 'text-amber-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]' : goldTextStyle}`}>
          {label}
        </span>
      </div>
      {subLabel && (
        <span className={`text-[9px] ml-7 ${highlight ? 'text-amber-800/80' : 'text-emerald-100/70'}`}>
          {subLabel}
        </span>
      )}
    </div>
    <span className={`text-lg font-black tabular-nums relative z-10 ${highlight ? 'text-amber-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]' : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'}`}>
      <AnimatedNumber value={value} fullNumber={fullNumber} />
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
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', userId)
            .neq('post_type', 'share'),
          
          supabase
            .from('post_likes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          
          userPostIds.length > 0
            ? supabase
                .from('post_likes')
                .select('id', { count: 'exact', head: true })
                .in('post_id', userPostIds)
            : Promise.resolve({ count: 0 }),
          
          supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', userId),
          
          userPostIds.length > 0
            ? supabase
                .from('comments')
                .select('id', { count: 'exact', head: true })
                .in('post_id', userPostIds)
            : Promise.resolve({ count: 0 }),
          
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', userId)
            .eq('post_type', 'share'),
          
          userPostIds.length > 0
            ? supabase
                .from('posts')
                .select('id', { count: 'exact', head: true })
                .in('original_post_id', userPostIds)
                .eq('post_type', 'share')
            : Promise.resolve({ count: 0 }),
          
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
            .maybeSingle(),
          
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
  // Total money = sent + received
  const { data: sentData } = { data: null }; // Will be fetched
  const [totalSent, setTotalSent] = useState(0);
  
  useEffect(() => {
    const fetchSentAmount = async () => {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('amount')
        .eq('sender_id', userId)
        .eq('status', 'completed');
      
      const sent = (data || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
      setTotalSent(sent);
    };
    if (userId) fetchSentAmount();
  }, [userId]);

  const totalMoney = totalSent + stats.totalReceived;

  return (
    <div className="relative w-full max-w-[480px] overflow-hidden rounded-xl border-2 border-emerald-300/80 shadow-[0_0_40px_rgba(16,185,129,0.5),0_0_80px_rgba(251,191,36,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${honorBoardBg})` }}
      />
      {/* Minimal overlay */}
      <div className="absolute inset-0 bg-black/5" />
      
      {/* Sparkle effects on background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-4 left-8 w-2 h-2 bg-white rounded-full animate-ping opacity-60" style={{ animationDuration: '3s' }} />
        <div className="absolute top-12 right-16 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-ping opacity-50" style={{ animationDuration: '2.5s', animationDelay: '0.7s' }} />
        <div className="absolute bottom-16 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-40" style={{ animationDuration: '4s', animationDelay: '1.2s' }} />
        <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-amber-200 rounded-full animate-ping opacity-50" style={{ animationDuration: '3.5s', animationDelay: '0.3s' }} />
        <div className="absolute bottom-8 right-12 w-1 h-1 bg-white rounded-full animate-ping opacity-60" style={{ animationDuration: '2.8s', animationDelay: '1.5s' }} />
        <div className="absolute top-20 left-1/3 w-0.5 h-0.5 bg-yellow-100 rounded-full animate-ping opacity-40" style={{ animationDuration: '3.2s', animationDelay: '2s' }} />
      </div>
      
      {/* Content */}
      <div className="relative z-10 p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={logoFunFarm} 
                alt="FUN FARM" 
                className="w-10 h-10 rounded-full border-2 border-emerald-300/90 shadow-[0_0_20px_rgba(16,185,129,0.9),0_0_40px_rgba(16,185,129,0.4)]"
              />
              <div className="absolute inset-0 rounded-full animate-pulse bg-emerald-300/40" />
            </div>
            <h2 
              className={`text-2xl font-black tracking-[0.15em] ${titleGoldStyle}`}
              style={{ 
                fontFamily: "'Orbitron', 'Segoe UI', sans-serif",
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.7)) drop-shadow(0 0 20px rgba(251,191,36,0.4))',
                textShadow: '0 0 30px rgba(251,191,36,0.5)'
              }}
            >
              ✦ HONOR BOARD ✦
            </h2>
          </div>
        </div>
        
        {/* User Name - Full display */}
        <div className={`flex items-center gap-3 px-3 py-2 rounded-xl mb-2 ${metallicFrameStyle}`}>
          <Avatar className="w-7 h-7 border-2 border-emerald-200/70 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-xs bg-emerald-800 text-emerald-100 font-bold">
              {(displayName || 'U')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
            {displayName || 'FUN Farmer'}
          </span>
        </div>

        {/* Legend for arrows */}
        <div className="flex justify-end gap-3 mb-1.5 text-[9px]">
          <span className="flex items-center gap-0.5 text-white font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            <ArrowUp className="w-3 h-3 text-emerald-300" /> Đã tương tác
          </span>
          <span className="flex items-center gap-0.5 text-white font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            <ArrowDown className="w-3 h-3 text-amber-300" /> Được nhận
          </span>
        </div>

        {/* Stats Grid - 2 columns */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
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
        <div className="space-y-1.5">
          <TotalRow 
            icon={DollarSign} 
            label="TOTAL REWARD" 
            value={totalReward}
            subLabel={`Chưa nhận: ${stats.claimable.toLocaleString()} + Đã nhận: ${stats.claimed.toLocaleString()}`}
            fullNumber
          />
          <TotalRow 
            icon={Wallet} 
            label="TOTAL MONEY" 
            value={totalMoney}
            subLabel={`Đã gửi: ${totalSent.toLocaleString()} + Đã nhận: ${stats.totalReceived.toLocaleString()}`}
            highlight 
            fullNumber
          />
        </div>
      </div>

      {/* Bottom decorative metallic line */}
      <div className="relative z-10 h-1.5 bg-gradient-to-r from-emerald-600/50 via-emerald-400 to-emerald-600/50 shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
      
      {/* Shimmer animation keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ProfileHonorBoard;
