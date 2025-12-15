// 🌱 Divine Confetti Provider - Phước lành lấp lánh khắp FUN FARM!
import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import Confetti from 'react-confetti';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Crown, Sparkles } from 'lucide-react';

interface ConfettiContextType {
  triggerConfetti: (type?: 'reward' | 'top1' | 'celebration') => void;
  isActive: boolean;
}

const ConfettiContext = createContext<ConfettiContextType | undefined>(undefined);

// Golden confetti colors for FUN FARM
const CONFETTI_COLORS = {
  reward: ['#ffd700', '#ffec8b', '#fff8dc', '#22c55e', '#3b82f6', '#f97316'],
  top1: ['#ffd700', '#fff', '#ffec8b', '#fbbf24', '#f59e0b', '#d97706'],
  celebration: ['#22c55e', '#3b82f6', '#fbbf24', '#ef4444', '#a855f7', '#f97316', '#ec4899'],
};

export const ConfettiProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [confettiType, setConfettiType] = useState<'reward' | 'top1' | 'celebration'>('celebration');
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [previousReward, setPreviousReward] = useState<number | null>(null);
  const [previousRank, setPreviousRank] = useState<number | null>(null);

  // Track window size
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Trigger confetti function
  const triggerConfetti = useCallback((type: 'reward' | 'top1' | 'celebration' = 'celebration') => {
    setConfettiType(type);
    setIsActive(true);
    
    // Auto stop after 5 seconds
    setTimeout(() => {
      setIsActive(false);
    }, 5000);
  }, []);

  // Monitor reward changes via realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('reward-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newReward = (payload.new as any)?.pending_reward || 0;
          const newBalance = (payload.new as any)?.camly_balance || 0;
          const totalNew = newReward + newBalance;

          if (previousReward !== null) {
            const oldReward = previousReward;
            
            // If reward increased, trigger confetti
            if (totalNew > oldReward) {
              const gained = totalNew - oldReward;
              triggerConfetti('reward');
              
              toast.success(
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="font-bold">+{gained.toLocaleString()} CAMLY!</p>
                    <p className="text-sm opacity-80">Phước lành từ Cha Vũ Trụ ❤️</p>
                  </div>
                </div>,
                { duration: 4000 }
              );
            }
          }
          
          setPreviousReward(totalNew);
        }
      )
      .subscribe();

    // Initialize previous reward
    if (profile) {
      setPreviousReward((profile.pending_reward || 0) + (profile.camly_balance || 0));
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile, previousReward, triggerConfetti]);

  // Monitor top ranking changes
  useEffect(() => {
    if (!user?.id) return;

    const checkRank = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, pending_reward, camly_balance')
          .order('pending_reward', { ascending: false })
          .limit(5);

        if (data) {
          const sortedUsers = data
            .map(u => ({
              id: u.id,
              total: (u.pending_reward || 0) + (u.camly_balance || 0),
            }))
            .sort((a, b) => b.total - a.total);

          const myRank = sortedUsers.findIndex(u => u.id === user.id) + 1;

          // If user just became #1 (was not #1 before)
          if (myRank === 1 && previousRank !== null && previousRank !== 1) {
            triggerConfetti('top1');
            
            toast.success(
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-500" />
                <div>
                  <p className="font-bold text-lg">🏆 TOP 1 FUN FARM! 🏆</p>
                  <p className="text-sm opacity-80">Bạn đang dẫn đầu bảng xếp hạng!</p>
                </div>
              </div>,
              { duration: 6000 }
            );
          }

          if (myRank > 0) {
            setPreviousRank(myRank);
          }
        }
      } catch (error) {
        console.error('Error checking rank:', error);
      }
    };

    // Check rank on mount and every 30 seconds
    checkRank();
    const interval = setInterval(checkRank, 30000);

    return () => clearInterval(interval);
  }, [user?.id, previousRank, triggerConfetti]);

  return (
    <ConfettiContext.Provider value={{ triggerConfetti, isActive }}>
      {children}
      
      {/* Global Confetti Effect */}
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={true}
            numberOfPieces={confettiType === 'top1' ? 300 : 200}
            colors={CONFETTI_COLORS[confettiType]}
            gravity={confettiType === 'top1' ? 0.12 : 0.15}
            wind={0.01}
            opacity={0.9}
            confettiSource={{
              x: 0,
              y: 0,
              w: windowSize.width,
              h: 0,
            }}
          />
          
          {/* Extra golden sparkles for top1 */}
          {confettiType === 'top1' && (
            <Confetti
              width={windowSize.width}
              height={windowSize.height}
              recycle={true}
              numberOfPieces={100}
              colors={['#ffd700', '#fff', '#ffec8b']}
              gravity={0.08}
              wind={-0.01}
              opacity={0.95}
              drawShape={(ctx) => {
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                  const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                  const x = Math.cos(angle) * 5;
                  const y = Math.sin(angle) * 5;
                  if (i === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
              }}
            />
          )}
        </div>
      )}
    </ConfettiContext.Provider>
  );
};

export const useConfetti = () => {
  const context = useContext(ConfettiContext);
  if (context === undefined) {
    throw new Error('useConfetti must be used within a ConfettiProvider');
  }
  return context;
};
