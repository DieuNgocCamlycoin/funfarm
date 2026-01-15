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

interface ProfileHonorBoardProps {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  variant?: 'cover' | 'standalone';
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

// Animated counter
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

// Styles - Stat rows với hiệu ứng bóng gương + viền vàng kim loại
const statRowStyle = {
  background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 30%, #16a34a 60%, #15803d 100%)',
  border: '2px solid #fbbf24',
  borderRadius: '20px',
  boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.5), inset 0 -4px 12px rgba(0,0,0,0.2), 0 0 10px rgba(251,191,36,0.5), 0 4px 8px rgba(0,0,0,0.3)',
};

const totalRowStyle = {
  background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 40%, #15803d 70%, #166534 100%)',
  border: '2.5px solid #fbbf24',
  borderRadius: '20px',
  boxShadow: 'inset 0 10px 20px rgba(255,255,255,0.45), inset 0 -5px 15px rgba(0,0,0,0.25), 0 0 15px rgba(251,191,36,0.6), 0 6px 12px rgba(0,0,0,0.35)',
};

// Stat row with given/received - compact
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
  <div 
    className="flex items-center justify-between px-2 py-1.5" 
    style={statRowStyle}
  >
    <div className="flex items-center gap-1">
      <Icon className="w-3 h-3 text-amber-300" style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.8))' }} />
      <span 
        className="text-[10px] font-bold uppercase tracking-wide"
        style={{ color: '#fbbf24', textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(251,191,36,0.5)' }}
      >
        {label}
      </span>
    </div>
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        <ArrowUp className="w-2.5 h-2.5 text-emerald-300" style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.8))' }} />
        <span className="text-xs font-bold text-white tabular-nums" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
          <AnimatedNumber value={given} />
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <ArrowDown className="w-2.5 h-2.5 text-amber-300" style={{ filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.8))' }} />
        <span className="text-xs font-bold text-white tabular-nums" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
          <AnimatedNumber value={received} />
        </span>
      </div>
    </div>
  </div>
);

// Simple stat row - compact
const StatRow = ({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number;
}) => (
  <div 
    className="flex items-center justify-between px-2 py-1.5" 
    style={statRowStyle}
  >
    <div className="flex items-center gap-1">
      <Icon className="w-3 h-3 text-amber-300" style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.8))' }} />
      <span 
        className="text-[10px] font-bold uppercase tracking-wide"
        style={{ color: '#fbbf24', textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(251,191,36,0.5)' }}
      >
        {label}
      </span>
    </div>
    <span className="text-xs font-bold text-white tabular-nums" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
      <AnimatedNumber value={value} />
    </span>
  </div>
);

// Total row - compact
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
  <div 
    className="flex items-center justify-between px-2.5 py-2" 
    style={isGold ? totalRowStyle : statRowStyle}
  >
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5">
        <Icon 
          className={`w-4 h-4 ${isGold ? 'text-amber-300' : 'text-emerald-300'}`} 
          style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.8))' }} 
        />
        <span 
          className="text-sm font-extrabold uppercase tracking-wide"
          style={{ color: '#fbbf24', textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(251,191,36,0.5)' }}
        >
          {label}
        </span>
      </div>
      {subLabel && (
        <span className="text-[9px] text-amber-200/90 ml-5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {subLabel}
        </span>
      )}
    </div>
    <span 
      className="text-lg font-black tabular-nums"
      style={{ 
        color: isGold ? '#ffd700' : '#6ee7b7',
        textShadow: isGold ? '0 2px 4px rgba(0,0,0,0.9), 0 0 15px rgba(255,215,0,0.6)' : '0 2px 4px rgba(0,0,0,0.9)' 
      }}
    >
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
                .neq('user_id', userId) // Exclude self-likes per v3.0 reward logic
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
                .neq('author_id', userId) // Exclude self-comments per v3.0 reward logic
            : Promise.resolve({ count: 0 }),
          
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', userId)
            .eq('post_type', 'share'),
          
          userPostIds.length > 0
            ? supabase
                .from('post_shares')
                .select('id', { count: 'exact', head: true })
                .in('post_id', userPostIds)
                .neq('user_id', userId) // Exclude self-share per v3.0 reward logic
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

  const totalReward = stats.claimable + stats.claimed;
  const totalReceived = totalReward + stats.totalReceivedFromUsers;
  const totalMoney = stats.totalSent + totalReceived;

  const metallicBorderStyle = variant === 'cover' 
    ? "border-2 border-amber-400/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_20px_rgba(251,191,36,0.3),0_0_40px_rgba(16,185,129,0.2)]"
    : "border-2 border-amber-400/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_20px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.25)]";

  return (
    <div 
      className={`
        relative overflow-hidden rounded-xl
        ${variant === 'cover' ? 'w-full max-w-[460px]' : 'w-full'}
      `}
      style={{
        background: 'linear-gradient(135deg, rgba(120,200,255,0.12) 0%, rgba(255,255,255,0.08) 30%, rgba(180,220,255,0.15) 70%, rgba(255,255,255,0.1) 100%)',
        backdropFilter: 'saturate(120%)',
        border: '3px solid #fbbf24',
        borderRadius: '20px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(200,150,0,0.4), 0 0 20px rgba(251,191,36,0.4), 0 8px 32px rgba(0,0,0,0.25)',
      }}
    >
      {/* Sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-ping opacity-50" style={{ animationDuration: '3s' }} />
        <div className="absolute top-6 right-8 w-1 h-1 bg-yellow-200 rounded-full animate-ping opacity-40" style={{ animationDuration: '2.5s', animationDelay: '0.7s' }} />
        <div className="absolute bottom-8 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-30" style={{ animationDuration: '4s', animationDelay: '1.2s' }} />
      </div>
      
      {/* Top highlight - Liquid Glass edge */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      
      {/* Content - compact padding */}
      <div className="relative z-10 p-2">
        {/* Header */}
        <div className="flex flex-col items-center mb-1.5">
          <div className="flex items-center gap-2 justify-center">
            <img 
              src={logoFunFarm} 
              alt="FUN FARM" 
              className="w-8 h-8 rounded-full border-2 border-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
            />
            <h2 
              className="text-lg md:text-xl font-black tracking-[0.08em]"
              style={{ 
                fontFamily: "'Orbitron', 'Segoe UI', sans-serif",
                color: '#ffd700',
                textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 20px rgba(255,215,0,0.7)',
              }}
            >
              ✦ HONOR BOARD ✦
            </h2>
          </div>
          
          <div className="flex items-center gap-1.5 justify-center mt-1">
            <Avatar className="w-6 h-6 border border-amber-400/60 shadow-[0_0_6px_rgba(251,191,36,0.4)]">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-[10px] bg-amber-700 text-amber-100 font-bold">
                {(displayName || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-bold" style={{ color: '#fbbf24', textShadow: '0 0 6px rgba(251,191,36,0.3)' }}>
              {displayName || 'FUN Farmer'}
            </span>
          </div>
        </div>

        {/* Stats Grid - tighter */}
        <div className="grid grid-cols-2 gap-1 mb-1.5">
          <div className="space-y-1">
            <StatRow icon={TrendingUp} label="POSTS" value={stats.postsCount} />
            <StatRowDouble icon={Star} label="REACTIONS" given={stats.reactionsGiven} received={stats.reactionsReceived} />
            <StatRowDouble icon={MessageCircle} label="COMMENTS" given={stats.commentsGiven} received={stats.commentsReceived} />
            <StatRowDouble icon={Share2} label="SHARES" given={stats.sharesGiven} received={stats.sharesReceived} />
          </div>
          
          <div className="space-y-1">
            <StatRow icon={Users} label="FRIENDS" value={stats.friendsCount} />
            <StatRow icon={Gift} label="NFTS" value={stats.nftsCount} />
            <StatRow icon={Coins} label="CLAIMABLE" value={stats.claimable} />
            <StatRow icon={Wallet} label="CLAIMED" value={stats.claimed} />
          </div>
        </div>

        {/* Totals - tighter */}
        <div className="space-y-1">
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

      {/* Bottom edge - Liquid Glass */}
      <div className="relative z-10 h-1 bg-gradient-to-r from-white/10 via-white/30 to-white/10" />
    </div>
  );
};

export default ProfileHonorBoard;
