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
  background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 30%, #16a34a 60%, #15803d 100%)',
  border: '2px solid #fbbf24',
  borderRadius: '20px',
  boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.5), inset 0 -4px 12px rgba(0,0,0,0.2), 0 0 10px rgba(251,191,36,0.5), 0 4px 8px rgba(0,0,0,0.3)',
};

const userRowTop3Style: React.CSSProperties = {
  background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 40%, #15803d 70%, #166534 100%)',
  border: '2.5px solid #fbbf24',
  borderRadius: '20px',
  boxShadow: 'inset 0 10px 20px rgba(255,255,255,0.45), inset 0 -5px 15px rgba(0,0,0,0.25), 0 0 15px rgba(251,191,36,0.6), 0 6px 12px rgba(0,0,0,0.35)',
};

// Laurel Frame component for Top 5 - renders frame in lower z-layer
const LaurelFrame = ({ rank }: { rank: number }) => {
  if (rank > 5) return null;
  
  const frameImage = frameImages[rank - 1];
  const glowSize = rank === 1 ? 18 : 12;
  
  return (
    <div 
      className="absolute inset-0 flex items-center justify-center z-0"
      style={{
        filter: `drop-shadow(0 0 ${glowSize}px ${glowColors[rank] || 'rgba(251,191,36,0.5)'})`,
      }}
    >
      <img 
        src={frameImage} 
        alt={`Top ${rank} frame`}
        className="w-full h-full object-contain"
        draggable={false}
      />
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
        <div className="flex items-center justify-center gap-3">
          <Star className="w-6 h-6 text-yellow-400 animate-pulse" />
          <h2 
            className="text-2xl md:text-3xl font-bold tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #ffd700, #fbbf24)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 10px rgba(255, 215, 0, 0.3)',
            }}
          >
            ⭐ TOP SPONSOR ⭐
          </h2>
          <Star className="w-6 h-6 text-yellow-400 animate-pulse" />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-2">
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
              <div className="flex items-center gap-2 p-2.5">
                {/* Avatar with Frame */}
                <div 
                  className="relative flex-shrink-0"
                  style={{ 
                    width: isTop5 ? (rank === 1 ? 140 : 130) : 40, 
                    height: isTop5 ? (rank === 1 ? 100 : 92) : 40,
                  }}
                >
                  {isTop5 && <LaurelFrame rank={rank} />}
                  <Avatar 
                    className={isTop5 ? "absolute rounded-full z-10" : "w-10 h-10"}
                    style={isTop5 ? { 
                      width: rank === 1 ? 48 : 44, 
                      height: rank === 1 ? 48 : 44, 
                      top: '42%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      border: `2px solid ${isTop3 ? '#fbbf24' : 'rgba(251, 191, 36, 0.5)'}`,
                      boxShadow: isTop3 ? '0 0 8px rgba(251, 191, 36, 0.5)' : 'none',
                    } : {
                      border: '2px solid rgba(255,255,255,0.5)',
                    }}
                  >
                    <AvatarImage src={sponsor.avatar_url || undefined} alt={sponsor.display_name || ''} />
                    <AvatarFallback 
                      className="text-sm font-bold"
                      style={{ 
                        background: 'linear-gradient(135deg, #059669, #047857)',
                        color: '#fbbf24',
                      }}
                    >
                      {sponsor.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {/* RankBadge for ranks > 5 */}
                  {!isTop5 && (
                    <div 
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-20"
                      style={{
                        background: 'linear-gradient(135deg, #059669, #34d399)',
                        border: '2px solid #047857',
                        color: '#ffffff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        fontSize: '11px',
                      }}
                    >
                      {rank}
                    </div>
                  )}
                </div>

                {/* User Info - căn phải giống TopRanking */}
                <div className="flex-1 min-w-0 text-right">
                  <div 
                    className="font-bold truncate"
                    style={{ 
                      fontSize: '1rem',
                      color: isTop3 ? '#ffd700' : '#ffffff',
                      textShadow: isTop3 
                        ? '0 2px 4px rgba(0,0,0,0.9), 0 0 15px rgba(251, 191, 36, 0.7)' 
                        : '0 2px 4px rgba(0,0,0,0.9)',
                    }}
                  >
                    {sponsor.display_name || 'Người dùng'}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <img src={camlyCoinImg} alt="CLC" className="w-5 h-5" />
                    <span 
                      className="font-extrabold"
                      style={{ 
                        fontSize: '1rem',
                        color: '#fbbf24',
                        textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 12px rgba(251, 191, 36, 0.8)',
                      }}
                    >
                      {formatNumber(sponsor.total_sent)}
                    </span>
                  </div>
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
