// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Free-Fee & Earn with Love."
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Star, Trophy } from 'lucide-react';
import camlyCoinImg from '@/assets/camly_coin.png';
import top1Frame from '@/assets/top1-frame.png';
import top2Frame from '@/assets/top2-frame.png';
import top3Frame from '@/assets/top3-frame.png';
import top4Frame from '@/assets/top4-frame.png';
import top5Frame from '@/assets/top5-frame.png';

interface TopSponsorUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_sent: number;
}

const frameImages = [top1Frame, top2Frame, top3Frame, top4Frame, top5Frame];

const glowColors: Record<number, string> = {
  1: '0 0 20px rgba(255, 215, 0, 0.6)',
  2: '0 0 15px rgba(192, 192, 192, 0.5)',
  3: '0 0 15px rgba(205, 127, 50, 0.5)',
  4: '0 0 12px rgba(16, 185, 129, 0.5)',
  5: '0 0 12px rgba(139, 92, 246, 0.5)',
};

const userRowStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #4ade80 0%, #15803d 100%)',
  border: '2px solid #fbbf24',
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
};

const userRowTop3Style: React.CSSProperties = {
  ...userRowStyle,
  border: '3px solid #ffd700',
  boxShadow: '0 6px 20px rgba(255, 215, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
};

// Laurel Frame component for Top 5
const LaurelFrame = ({ rank, children }: { rank: number; children: React.ReactNode }) => {
  if (rank > 5) return <>{children}</>;
  
  const frameImage = frameImages[rank - 1];
  const isTop1 = rank === 1;
  const frameSize = isTop1 ? { width: 140, height: 100 } : { width: 130, height: 92 };
  const avatarSize = isTop1 ? 48 : 44;
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: frameSize.width, height: frameSize.height }}>
      <img 
        src={frameImage} 
        alt={`Top ${rank} frame`}
        className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none"
        style={{ 
          filter: `drop-shadow(${glowColors[rank] || 'none'})`,
        }}
      />
      <div 
        className="absolute z-0"
        style={{ 
          top: '42%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div style={{ width: avatarSize, height: avatarSize }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Rank Badge for ranks > 5
const RankBadge = ({ rank }: { rank: number }) => {
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-bold text-sm shadow-lg">
      {rank}
    </div>
  );
};

const formatNumber = (num: number): string => {
  return num.toLocaleString('vi-VN');
};

const TopSponsor = () => {
  const navigate = useNavigate();
  const [topSponsors, setTopSponsors] = useState<TopSponsorUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const fetchTopSponsors = async () => {
    try {
      // First, get aggregated totals from wallet_transactions
      const { data: transactionData, error: txError } = await supabase
        .from('wallet_transactions')
        .select('sender_id, amount')
        .eq('status', 'completed');

      if (txError) throw txError;

      // Aggregate by sender_id
      const senderTotals: Record<string, number> = {};
      transactionData?.forEach(tx => {
        senderTotals[tx.sender_id] = (senderTotals[tx.sender_id] || 0) + tx.amount;
      });

      // Get top 20 sender IDs
      const sortedSenders = Object.entries(senderTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

      if (sortedSenders.length === 0) {
        setTopSponsors([]);
        return;
      }

      const senderIds = sortedSenders.map(([id]) => id);

      // Fetch profiles for these senders
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', senderIds);

      if (profileError) throw profileError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine data
      const sponsors: TopSponsorUser[] = sortedSenders.map(([id, total]) => {
        const profile = profileMap.get(id);
        return {
          id,
          display_name: profile?.display_name || 'Người dùng',
          avatar_url: profile?.avatar_url || null,
          total_sent: total,
        };
      });

      setTopSponsors(sponsors);
    } catch (error) {
      console.error('Error fetching top sponsors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopSponsors();
    const interval = setInterval(fetchTopSponsors, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const displayedSponsors = showAll ? topSponsors : topSponsors.slice(0, 5);

  if (isLoading) {
    return (
      <div 
        className="mb-6 rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(10px)',
          border: '3px solid #fbbf24',
          boxShadow: '0 8px 32px rgba(251, 191, 36, 0.15)',
        }}
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (topSponsors.length === 0) {
    return (
      <div 
        className="mb-6 rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(10px)',
          border: '3px solid #fbbf24',
          boxShadow: '0 8px 32px rgba(251, 191, 36, 0.15)',
        }}
      >
        <div className="text-center py-6 text-muted-foreground">
          Chưa có nhà tài trợ thiên thần
        </div>
      </div>
    );
  }

  return (
    <div 
      className="mb-6 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(10px)',
        border: '3px solid #fbbf24',
        boxShadow: '0 8px 32px rgba(251, 191, 36, 0.15)',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-primary/20">
        <div className="flex items-center justify-center gap-2">
          <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
          <h2 
            className="text-xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #ffd700, #fbbf24)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 10px rgba(255, 215, 0, 0.3)',
            }}
          >
            TOP SPONSOR
          </h2>
          <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-1">
          Vinh danh Nhà Tài Trợ Thiên Thần
        </p>
      </div>

      {/* Sponsor List */}
      <div className="p-4 space-y-3">
        {displayedSponsors.map((sponsor, index) => {
          const rank = index + 1;
          const isTop3 = rank <= 3;
          const isTop5 = rank <= 5;

          return (
            <div
              key={sponsor.id}
              className="stat-row-shine relative cursor-pointer transition-all duration-300 hover:scale-[1.02]"
              style={isTop3 ? userRowTop3Style : userRowStyle}
              onClick={() => navigate(`/user/${sponsor.id}`)}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Rank/Frame */}
                {isTop5 ? (
                  <LaurelFrame rank={rank}>
                    <Avatar className="w-full h-full border-2 border-white/50">
                      <AvatarImage src={sponsor.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {sponsor.display_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </LaurelFrame>
                ) : (
                  <div className="flex items-center gap-3">
                    <RankBadge rank={rank} />
                    <Avatar className="w-10 h-10 border-2 border-white/50">
                      <AvatarImage src={sponsor.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {sponsor.display_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p 
                    className="font-semibold truncate"
                    style={{ 
                      color: '#ffd700',
                      textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  >
                    {sponsor.display_name || 'Người dùng'}
                  </p>
                </div>

                {/* Amount */}
                <div className="flex items-center gap-1.5">
                  <img src={camlyCoinImg} alt="CLC" className="w-5 h-5" />
                  <span 
                    className="font-bold"
                    style={{ 
                      color: '#ffffff',
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    }}
                  >
                    {formatNumber(sponsor.total_sent)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Show More/Less Button */}
        {topSponsors.length > 5 && (
          <Button
            variant="ghost"
            className="w-full mt-2 text-primary hover:bg-primary/10"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Thu gọn
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Xem thêm ({topSponsors.length - 5})
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TopSponsor;
