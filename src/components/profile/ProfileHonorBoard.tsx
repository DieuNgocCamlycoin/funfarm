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
  variant?: 'cover' | 'standalone'; // cover = trong ảnh bìa, standalone = riêng biệt (mobile)
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

// Metallic gold text style
const goldTextStyle = "text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]";

// Title gold style
const titleGoldStyle = "text-transparent bg-clip-text bg-gradient-to-b from-yellow-50 via-amber-200 to-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]";

// Metallic frame - subtle
const metallicFrameStyle = "bg-black/20 border border-emerald-400/40 backdrop-blur-[2px] rounded-lg";

// Golden frame
const goldenFrameStyle = "bg-black/25 border-2 border-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.25)] backdrop-blur-[2px] rounded-xl";

// Stat row with given/received
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
  <div className={`flex items-center justify-between px-2 py-1.5 ${metallicFrameStyle}`}>
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-amber-300" style={{ filter: 'drop-shadow(0 0 2px rgba(251,191,36,0.5))' }} />
      <span className={`text-xs font-bold uppercase tracking-wide ${goldTextStyle}`}>
        {label}
      </span>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        <ArrowUp className="w-3 h-3 text-emerald-300" />
        <span className="text-sm font-bold text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          <AnimatedNumber value={given} />
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <ArrowDown className="w-3 h-3 text-amber-300" />
        <span className="text-sm font-bold text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          <AnimatedNumber value={received} />
        </span>
      </div>
    </div>
  </div>
);

// Simple stat row
const StatRow = ({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number;
}) => (
  <div className={`flex items-center justify-between px-2 py-1.5 ${metallicFrameStyle}`}>
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-amber-300" style={{ filter: 'drop-shadow(0 0 2px rgba(251,191,36,0.5))' }} />
      <span className={`text-xs font-bold uppercase tracking-wide ${goldTextStyle}`}>
        {label}
      </span>
    </div>
    <span className="text-sm font-bold text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
      <AnimatedNumber value={value} />
    </span>
  </div>
);

// Total row
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
  <div className={`flex items-center justify-between px-3 py-2 ${isGold ? goldenFrameStyle : metallicFrameStyle}`}>
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${isGold ? 'text-amber-300' : 'text-emerald-300'}`} style={{ filter: 'drop-shadow(0 0 3px rgba(251,191,36,0.4))' }} />
        <span className={`text-base font-extrabold uppercase tracking-wide ${goldTextStyle}`}>
          {label}
        </span>
      </div>
      {subLabel && (
        <span className="text-[10px] text-amber-200/70 ml-7">
          {subLabel}
        </span>
      )}
    </div>
    <span className={`text-xl font-black tabular-nums ${isGold ? titleGoldStyle : 'text-emerald-300'} drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]`}>
      <AnimatedNumber value={value} />
    </span>
  </div>
);

const ProfileHonorBoard = ({ userId, displayName, avatarUrl, variant = 'cover' }: ProfileHonorBoardProps) => {
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
          
          supabase
            .from('wallet_transactions')
            .select('amount')
            .eq('sender_id', userId)
            .eq('status', 'completed'),
          
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

  // Metallic border gradient
  const metallicBorderStyle = variant === 'cover' 
    ? "border-2 border-amber-400/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_20px_rgba(251,191,36,0.3),0_0_40px_rgba(16,185,129,0.2)]"
    : "border-2 border-amber-400/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_20px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.25)]";

  return (
    <div 
      className={`
        relative overflow-hidden rounded-xl 
        ${metallicBorderStyle}
        ${variant === 'cover' ? 'w-full max-w-[480px] h-full max-h-[350px]' : 'w-full'}
      `}
    >
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${honorBoardBg})` }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/10" />
      
      {/* Sparkle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-3 left-6 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-50" style={{ animationDuration: '3s' }} />
        <div className="absolute top-8 right-12 w-1 h-1 bg-yellow-200 rounded-full animate-ping opacity-40" style={{ animationDuration: '2.5s', animationDelay: '0.7s' }} />
        <div className="absolute bottom-12 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-30" style={{ animationDuration: '4s', animationDelay: '1.2s' }} />
        <div className="absolute bottom-6 right-8 w-1 h-1 bg-amber-200 rounded-full animate-ping opacity-40" style={{ animationDuration: '2.8s', animationDelay: '1.5s' }} />
      </div>
      
      {/* Top metallic edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 p-3">
        {/* Header - CENTERED */}
        <div className="flex flex-col items-center mb-2">
          {/* Logo + Title */}
          <div className="flex items-center gap-2 justify-center">
            <div className="relative">
              <img 
                src={logoFunFarm} 
                alt="FUN FARM" 
                className="w-10 h-10 rounded-full border-2 border-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
              />
            </div>
            <h2 
              className={`text-xl md:text-2xl font-black tracking-[0.08em] ${titleGoldStyle}`}
              style={{ 
                fontFamily: "'Orbitron', 'Segoe UI', sans-serif",
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7)) drop-shadow(0 0 15px rgba(251,191,36,0.4))',
              }}
            >
              ✦ HONOR BOARD ✦
            </h2>
          </div>
          
          {/* Avatar + Name */}
          <div className="flex items-center gap-2 justify-center mt-2">
            <Avatar className="w-7 h-7 border-2 border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.4)]">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-xs bg-amber-700 text-amber-100 font-bold">
                {(displayName || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={`text-base font-bold ${goldTextStyle}`} style={{ textShadow: '0 0 8px rgba(251,191,36,0.3)' }}>
              {displayName || 'FUN Farmer'}
            </span>
          </div>
        </div>

        {/* Stats Grid - 2 columns, compact */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {/* Left Column */}
          <div className="space-y-1.5">
            <StatRow icon={TrendingUp} label="POSTS" value={stats.postsCount} />
            <StatRowDouble icon={Star} label="REACTIONS" given={stats.reactionsGiven} received={stats.reactionsReceived} />
            <StatRowDouble icon={MessageCircle} label="COMMENTS" given={stats.commentsGiven} received={stats.commentsReceived} />
            <StatRowDouble icon={Share2} label="SHARES" given={stats.sharesGiven} received={stats.sharesReceived} />
          </div>
          
          {/* Right Column */}
          <div className="space-y-1.5">
            <StatRow icon={Users} label="FRIENDS" value={stats.friendsCount} />
            <StatRow icon={Gift} label="NFTS" value={stats.nftsCount} />
            <StatRow icon={Coins} label="CLAIMABLE" value={stats.claimable} />
            <StatRow icon={Wallet} label="BALANCE" value={stats.claimed} />
          </div>
        </div>

        {/* Full-width totals */}
        <div className="space-y-1.5">
          <TotalRow 
            icon={DollarSign} 
            label="TOTAL REWARD" 
            value={totalReward}
            subLabel={`Chờ: ${stats.claimable.toLocaleString('vi-VN')} + Số dư: ${stats.claimed.toLocaleString('vi-VN')}`}
          />
          <TotalRow 
            icon={Wallet} 
            label="TOTAL MONEY" 
            value={totalMoney}
            subLabel={`Gửi: ${stats.totalSent.toLocaleString('vi-VN')} + Nhận: ${totalReceived.toLocaleString('vi-VN')}`}
            isGold
          />
        </div>
      </div>

      {/* Bottom metallic edge */}
      <div className="relative z-10 h-1 bg-gradient-to-r from-emerald-600/30 via-amber-400/60 to-emerald-600/30" />
    </div>
  );
};

export default ProfileHonorBoard;
