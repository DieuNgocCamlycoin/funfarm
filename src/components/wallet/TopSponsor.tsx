// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Free-Fee & Earn with Love."
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, HeartHandshake } from 'lucide-react';
import camlyCoinImg from '@/assets/camly_coin.png';

interface TopSponsorUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_sent: number;
}

const RankBadge = ({ rank }: { rank: number }) => {
  return <span className={`ff-rank-medal ff-rank-${Math.min(rank, 4)}`}>{rank}</span>;
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
        .select('sender_id, amount_decimal')
        .eq('status', 'verified');

      if (txError) throw txError;

      // Aggregate by sender_id
      const senderTotals: Record<string, number> = {};
      transactionData?.forEach(tx => {
        senderTotals[tx.sender_id] = (senderTotals[tx.sender_id] || 0) + Number(tx.amount_decimal || 0);
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
      <div className="ff-luxury-panel ff-ranking-panel rounded-2xl p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (topSponsors.length === 0) {
    return (
      <div className="ff-luxury-panel ff-ranking-panel rounded-2xl p-4">
        <div className="text-center py-6 text-muted-foreground">
          Chưa có nhà tài trợ thiên thần
        </div>
      </div>
    );
  }

  return (
    <div className="ff-luxury-panel ff-ranking-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-center justify-center gap-2.5">
          <HeartHandshake className="h-5 w-5 text-[#bd8b18]" />
          <h2 className="ff-metallic-gold-text text-xl font-black tracking-[0.12em]">
            TOP SPONSOR
          </h2>
        </div>
        <p className="mt-1 text-center text-xs text-emerald-900/60">
          Vinh danh Nhà Tài Trợ Thiên Thần
        </p>
      </div>

      {/* Sponsor List */}
      <div className="px-4 pb-4 space-y-2.5">
        {displayedSponsors.map((sponsor, index) => {
          const rank = index + 1;
          return (
            <div
              key={sponsor.id}
              className="ff-compact-rank-row flex items-center gap-2.5 px-3 py-2 cursor-pointer"
              onClick={() => navigate(`/user/${sponsor.id}`)}
            >
              <RankBadge rank={rank} />
              <Avatar className="h-10 w-10 shrink-0 rounded-full border border-[#e2c46f]">
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

                {/* User Info - căn phải giống TopRanking */}
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-bold text-white">
                    {sponsor.display_name || 'Người dùng'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <img src={camlyCoinImg} alt="CLC" className="w-4 h-4" />
                    <span className="ff-clean-gold-text text-sm font-extrabold tabular-nums">
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
