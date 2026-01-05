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
  camlyBalance: number;
  totalSent: number;
  totalReceivedFromUsers: number;
}

// Animated counter component - shows full numbers
const AnimatedNumber = ({ value }: { value: number }) => {
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

  return <span>{displayValue.toLocaleString('vi-VN')}</span>;
};

// Metallic gold text style - bright and readable
const goldTextStyle = "text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]";

// Title gold style - larger, brighter
const titleGoldStyle = "text-transparent bg-clip-text bg-gradient-to-b from-yellow-50 via-amber-200 to-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]";

// Metallic frame - subtle border with blur background (không nổi bật)
const metallicFrameStyle = "bg-black/25 border border-emerald-400/50 shadow-[0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm";

// Golden metallic frame for Total Money - subtle gold border
const goldenFrameStyle = "bg-black/30 border-2 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.3)] backdrop-blur-sm";

// Stat row with given/received - LARGER TEXT
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
  <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${metallicFrameStyle}`}>
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-amber-300" style={{ filter: 'drop-shadow(0 0 3px rgba(251,191,36,0.6))' }} />
      <span className={`text-sm font-bold uppercase tracking-wide ${goldTextStyle}`}>
        {label}
      </span>
    </div>
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <ArrowUp className="w-3.5 h-3.5 text-emerald-300" />
        <span className="text-base font-bold text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
          <AnimatedNumber value={given} />
        </span>
      </div>
      <div className="flex items-center gap-1">
        <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
        <span className="text-base font-bold text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
          <AnimatedNumber value={received} />
        </span>
      </div>
    </div>
  </div>
);

// Simple stat row - LARGER TEXT
const StatRow = ({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number;
}) => (
  <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${metallicFrameStyle}`}>
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-amber-300" style={{ filter: 'drop-shadow(0 0 3px rgba(251,191,36,0.6))' }} />
      <span className={`text-sm font-bold uppercase tracking-wide ${goldTextStyle}`}>
        {label}
      </span>
    </div>
    <span className="text-base font-bold text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
      <AnimatedNumber value={value} />
    </span>
  </div>
);

// Full-width stat row for totals - LARGER TEXT
const TotalRow = ({ 
  icon: Icon, 
  label, 
  value,
  subLabel,
  isGold = false
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number;
  subLabel?: string;
  isGold?: boolean;
}) => (
  <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${isGold ? goldenFrameStyle : metallicFrameStyle}`}>
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Icon className={`w-6 h-6 ${isGold ? 'text-amber-300' : 'text-emerald-300'}`} style={{ filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.5))' }} />
        <span className={`text-lg font-extrabold uppercase tracking-wide ${goldTextStyle}`}>
          {label}
        </span>
      </div>
      {subLabel && (
        <span className="text-xs text-amber-200/80 ml-8">
          {subLabel}
        </span>
      )}
    </div>
    <span className={`text-2xl font-black tabular-nums ${isGold ? titleGoldStyle : 'text-emerald-300'} drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]`}>
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
    camlyBalance: 0,
    totalSent: 0,
    totalReceivedFromUsers: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) return;
      
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
          sentResult,
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
          
          // Wallet sent
          supabase
            .from('wallet_transactions')
            .select('amount')
            .eq('sender_id', userId)
            .eq('status', 'completed'),
          
          // Wallet received from users
          supabase
            .from('wallet_transactions')
            .select('amount')
            .eq('receiver_id', userId)
            .eq('status', 'completed')
        ]);

        const pendingReward = profileResult.data?.pending_reward || 0;
        const approvedReward = profileResult.data?.approved_reward || 0;
        const camlyBalance = profileResult.data?.camly_balance || 0;
        
        const totalSent = (sentResult.data || []).reduce(
          (sum, tx) => sum + (tx.amount || 0), 0
        );
        const totalReceivedFromUsers = (receivedResult.data || []).reduce(
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
          camlyBalance,
          totalSent,
          totalReceivedFromUsers,
        });
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      }
    };

    fetchStats();
  }, [userId]);

  // TOTAL REWARD = pending + approved + camly_balance
  const totalReward = stats.claimable + stats.claimed;
  
  // TOTAL RECEIVED = Total Reward + Quà từ người dùng khác
  const totalReceived = totalReward + stats.totalReceivedFromUsers;
  
  // TOTAL MONEY = Đã gửi + Đã nhận (tổng lưu thông)
  const totalMoney = stats.totalSent + totalReceived;

  return (
    <div className="relative w-full max-w-[520px] overflow-hidden rounded-xl border-2 border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.4),0_0_60px_rgba(251,191,36,0.2)]">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${honorBoardBg})` }}
      />
      {/* Minimal overlay - 5% */}
      <div className="absolute inset-0 bg-black/5" />
      
      {/* Sparkle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-4 left-8 w-2 h-2 bg-white rounded-full animate-ping opacity-60" style={{ animationDuration: '3s' }} />
        <div className="absolute top-12 right-16 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-ping opacity-50" style={{ animationDuration: '2.5s', animationDelay: '0.7s' }} />
        <div className="absolute bottom-16 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-40" style={{ animationDuration: '4s', animationDelay: '1.2s' }} />
        <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-amber-200 rounded-full animate-ping opacity-50" style={{ animationDuration: '3.5s', animationDelay: '0.3s' }} />
        <div className="absolute bottom-8 right-12 w-1 h-1 bg-white rounded-full animate-ping opacity-60" style={{ animationDuration: '2.8s', animationDelay: '1.5s' }} />
      </div>
      
      {/* Content */}
      <div className="relative z-10 p-4">
        {/* Header - CENTERED */}
        <div className="flex flex-col items-center mb-4">
          {/* Logo + Title - Centered */}
          <div className="flex items-center gap-3 justify-center">
            <div className="relative">
              <img 
                src={logoFunFarm} 
                alt="FUN FARM" 
                className="w-12 h-12 rounded-full border-2 border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.6)]"
              />
              <div className="absolute inset-0 rounded-full animate-pulse bg-amber-300/30" />
            </div>
            <h2 
              className={`text-3xl md:text-4xl font-black tracking-[0.1em] ${titleGoldStyle}`}
              style={{ 
                fontFamily: "'Orbitron', 'Segoe UI', sans-serif",
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.8)) drop-shadow(0 0 25px rgba(251,191,36,0.5))',
              }}
            >
              ✦ HONOR BOARD ✦
            </h2>
          </div>
          
          {/* Avatar + Name - Centered below title */}
          <div className="flex items-center gap-2 justify-center mt-3">
            <Avatar className="w-9 h-9 border-2 border-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.5)]">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-sm bg-amber-700 text-amber-100 font-bold">
                {(displayName || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={`text-xl font-bold ${goldTextStyle}`} style={{ textShadow: '0 0 12px rgba(251,191,36,0.4)' }}>
              {displayName || 'FUN Farmer'}
            </span>
          </div>
        </div>

        {/* Legend for arrows */}
        <div className="flex justify-center gap-4 mb-2 text-xs">
          <span className="flex items-center gap-1 text-white font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            <ArrowUp className="w-3.5 h-3.5 text-emerald-300" /> Đã cho
          </span>
          <span className="flex items-center gap-1 text-white font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            <ArrowDown className="w-3.5 h-3.5 text-amber-300" /> Đã nhận
          </span>
        </div>

        {/* Stats Grid - 2 columns */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Left Column */}
          <div className="space-y-2">
            <StatRow icon={TrendingUp} label="POSTS" value={stats.postsCount} />
            <StatRowDouble icon={Star} label="REACTIONS" given={stats.reactionsGiven} received={stats.reactionsReceived} />
            <StatRowDouble icon={MessageCircle} label="COMMENTS" given={stats.commentsGiven} received={stats.commentsReceived} />
            <StatRowDouble icon={Share2} label="SHARES" given={stats.sharesGiven} received={stats.sharesReceived} />
          </div>
          
          {/* Right Column */}
          <div className="space-y-2">
            <StatRow icon={Users} label="FRIENDS" value={stats.friendsCount} />
            <StatRow icon={Gift} label="NFTS" value={stats.nftsCount} />
            <StatRow icon={Coins} label="CLAIMABLE" value={stats.claimable} />
            <StatRow icon={Wallet} label="BALANCE" value={stats.claimed} />
          </div>
        </div>

        {/* Full-width totals */}
        <div className="space-y-2">
          <TotalRow 
            icon={DollarSign} 
            label="TOTAL REWARD" 
            value={totalReward}
            subLabel={`Chờ duyệt: ${stats.claimable.toLocaleString('vi-VN')} + Số dư: ${stats.claimed.toLocaleString('vi-VN')}`}
          />
          <TotalRow 
            icon={Wallet} 
            label="TOTAL MONEY" 
            value={totalMoney}
            subLabel={`Đã gửi: ${stats.totalSent.toLocaleString('vi-VN')} + Đã nhận: ${totalReceived.toLocaleString('vi-VN')}`}
            isGold
          />
        </div>
      </div>

      {/* Bottom decorative metallic line */}
      <div className="relative z-10 h-1.5 bg-gradient-to-r from-emerald-600/40 via-amber-400/70 to-emerald-600/40" />
    </div>
  );
};

export default ProfileHonorBoard;
