// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Top Ranking - Bảng xếp hạng người dùng lương thiện - Design theo thiết kế

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import funFarmLogo from "@/assets/logo_fun_farm_web3.png";
import camlyCoin from "@/assets/camly_coin.png";

interface TopUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_reward: number;
  is_good_heart: boolean;
}

interface TopRankingProps {
  compact?: boolean;
}

// Sparkle particles
const SparkleParticles = () => {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 6}s`,
    duration: `${4 + Math.random() * 3}s`,
    size: 1 + Math.random() * 2,
    type: i % 4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-sparkle-fall"
          style={{
            left: p.left,
            top: '-10px',
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        >
          <div 
            className="rounded-full"
            style={{
              width: p.size + 'px',
              height: p.size + 'px',
              background: p.type === 0 
                ? '#ffffff'
                : p.type === 1 
                ? '#ffd700'
                : p.type === 2
                ? '#ffec8b'
                : '#fff8dc',
              boxShadow: `0 0 ${p.size * 3}px ${p.type === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,215,0,0.9)'}`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

// Corner ornament decorative
const CornerOrnament = ({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) => {
  const styles: Record<string, React.CSSProperties> = {
    'top-left': { top: 8, left: 8, borderTop: '3px solid', borderLeft: '3px solid', borderRadius: '8px 0 0 0' },
    'top-right': { top: 8, right: 8, borderTop: '3px solid', borderRight: '3px solid', borderRadius: '0 8px 0 0' },
    'bottom-left': { bottom: 8, left: 8, borderBottom: '3px solid', borderLeft: '3px solid', borderRadius: '0 0 0 8px' },
    'bottom-right': { bottom: 8, right: 8, borderBottom: '3px solid', borderRight: '3px solid', borderRadius: '0 0 8px 0' },
  };

  return (
    <div 
      className="absolute w-6 h-6 z-30"
      style={{
        ...styles[position],
        borderColor: '#ffd700',
        filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.8))',
      }}
    />
  );
};

// Laurel wreath SVG for avatar frame
const LaurelWreath = ({ rank }: { rank: number }) => {
  const color = rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#ffd700';
  
  return (
    <svg 
      width="72" 
      height="72" 
      viewBox="0 0 100 100" 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ filter: `drop-shadow(0 0 8px ${color})` }}
    >
      {/* Left laurel branch */}
      <ellipse cx="22" cy="35" rx="8" ry="14" fill="none" stroke={color} strokeWidth="2" transform="rotate(-30 22 35)" opacity="0.9"/>
      <ellipse cx="18" cy="48" rx="7" ry="12" fill="none" stroke={color} strokeWidth="2" transform="rotate(-20 18 48)" opacity="0.8"/>
      <ellipse cx="16" cy="62" rx="6" ry="11" fill="none" stroke={color} strokeWidth="2" transform="rotate(-10 16 62)" opacity="0.7"/>
      
      {/* Right laurel branch (mirrored) */}
      <ellipse cx="78" cy="35" rx="8" ry="14" fill="none" stroke={color} strokeWidth="2" transform="rotate(30 78 35)" opacity="0.9"/>
      <ellipse cx="82" cy="48" rx="7" ry="12" fill="none" stroke={color} strokeWidth="2" transform="rotate(20 82 48)" opacity="0.8"/>
      <ellipse cx="84" cy="62" rx="6" ry="11" fill="none" stroke={color} strokeWidth="2" transform="rotate(10 84 62)" opacity="0.7"/>
      
      {/* Crown for rank 1 */}
      {rank === 1 && (
        <path
          d="M38 20 L42 10 L50 18 L58 10 L62 20"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};

const TopRanking = ({ compact = false }: TopRankingProps) => {
  const navigate = useNavigate();
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const fetchTopUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, pending_reward, camly_balance, is_good_heart")
        .order("pending_reward", { ascending: false })
        .limit(20);

      if (error) throw error;

      const transformedUsers: TopUser[] = (data || []).map((user) => ({
        id: user.id,
        display_name: user.display_name || "Nông dân FUN",
        avatar_url: user.avatar_url,
        total_reward: (user.pending_reward || 0) + (user.camly_balance || 0),
        is_good_heart: user.is_good_heart || false,
      }));

      transformedUsers.sort((a, b) => b.total_reward - a.total_reward);
      setTopUsers(transformedUsers);
    } catch (error) {
      console.error("Error fetching top users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopUsers();
    const interval = setInterval(fetchTopUsers, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString("vi-VN");
  };

  const displayedUsers = showAll ? topUsers : topUsers.slice(0, 5);

  return (
    <div 
      className="relative overflow-hidden rounded-[20px] p-1"
      style={{
        background: 'linear-gradient(135deg, #ffd700 0%, #b8860b 25%, #ffd700 50%, #daa520 75%, #ffd700 100%)',
        boxShadow: '0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.3)',
      }}
    >
      {/* Inner container with cosmos background */}
      <div 
        className="relative overflow-hidden rounded-[16px]"
        style={{
          background: 'linear-gradient(160deg, #1a472a 0%, #0d3320 20%, #0a2818 40%, #071f14 60%, #0a2818 80%, #0d3320 100%)',
        }}
      >
        {/* Cosmic gradient overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 20%, rgba(0, 100, 180, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, rgba(184, 134, 11, 0.25) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(34, 139, 34, 0.2) 0%, transparent 70%)
            `,
          }}
        />
        
        {/* Starfield effect */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.8), transparent),
              radial-gradient(2px 2px at 40px 70px, rgba(255,215,0,0.7), transparent),
              radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.6), transparent),
              radial-gradient(2px 2px at 130px 80px, rgba(255,215,0,0.5), transparent),
              radial-gradient(1px 1px at 160px 30px, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 50px 120px, rgba(255,215,0,0.6), transparent),
              radial-gradient(2px 2px at 180px 120px, rgba(255,255,255,0.5), transparent)
            `,
            backgroundSize: '200px 150px',
            animation: 'twinkle 3s ease-in-out infinite',
          }}
        />

        <SparkleParticles />
        
        {/* Golden glow from corners */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-radial from-yellow-500/30 to-transparent blur-xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-radial from-yellow-500/30 to-transparent blur-xl" />
        
        {/* Corner ornaments */}
        <CornerOrnament position="top-left" />
        <CornerOrnament position="top-right" />
        <CornerOrnament position="bottom-left" />
        <CornerOrnament position="bottom-right" />

        <div className={`relative z-10 ${compact ? 'p-4' : 'p-6'}`}>
          {/* Title */}
          <h2 
            className={`text-center font-extrabold ${compact ? 'text-xl' : 'text-2xl md:text-3xl'} tracking-[0.15em] mb-5`}
            style={{
              color: '#ffd700',
              textShadow: `
                0 0 10px rgba(255, 215, 0, 1),
                0 0 20px rgba(255, 215, 0, 0.8),
                0 0 40px rgba(255, 215, 0, 0.6),
                0 2px 4px rgba(0, 0, 0, 0.8)
              `,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            TOP RANKING
          </h2>

          {/* User List */}
          <div className="space-y-3">
            {isLoading ? (
              <div 
                className="text-center py-8 font-medium"
                style={{ color: '#ffd700', textShadow: '0 0 8px rgba(255, 215, 0, 0.5)' }}
              >
                Đang tải bảng xếp hạng...
              </div>
            ) : topUsers.length === 0 ? (
              <div 
                className="text-center py-8 font-medium"
                style={{ color: '#ffd700', textShadow: '0 0 8px rgba(255, 215, 0, 0.5)' }}
              >
                Chưa có dữ liệu
              </div>
            ) : (
              displayedUsers.map((user, index) => (
                <div
                  key={user.id}
                  className="relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, rgba(10, 40, 24, 0.9) 0%, rgba(7, 31, 20, 0.95) 100%)',
                    border: '2px solid',
                    borderImage: 'linear-gradient(135deg, #ffd700, #b8860b, #ffd700) 1',
                    boxShadow: index === 0 
                      ? '0 0 25px rgba(255, 215, 0, 0.5), inset 0 0 15px rgba(255, 215, 0, 0.15)'
                      : '0 0 15px rgba(255, 215, 0, 0.3), inset 0 0 10px rgba(255, 215, 0, 0.1)',
                  }}
                  onClick={() => navigate(`/user/${user.id}`)}
                >
                  <div className={`flex items-center gap-3 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
                    {/* Avatar with laurel wreath */}
                    <div className={`relative ${compact ? 'w-12 h-12' : 'w-14 h-14'} flex-shrink-0`}>
                      {index < 3 && <LaurelWreath rank={index + 1} />}
                      <Avatar 
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}
                        style={{
                          border: `3px solid ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'rgba(255, 215, 0, 0.5)'}`,
                          boxShadow: `0 0 15px ${index === 0 ? 'rgba(255, 215, 0, 0.8)' : index === 1 ? 'rgba(192, 192, 192, 0.6)' : index === 2 ? 'rgba(205, 127, 50, 0.6)' : 'rgba(255, 215, 0, 0.3)'}`,
                        }}
                      >
                        <AvatarImage src={user.avatar_url || funFarmLogo} />
                        <AvatarFallback 
                          className="font-bold"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(184, 134, 11, 0.2))',
                            color: '#ffd700',
                          }}
                        >
                          {user.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Crown for rank 1 */}
                      {index === 0 && (
                        <Crown 
                          className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-5"
                          style={{ 
                            color: '#ffd700',
                            filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.9))',
                          }}
                        />
                      )}
                      
                      {/* Good heart badge */}
                      {user.is_good_heart && (
                        <div 
                          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] z-20"
                          style={{
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                            border: '2px solid rgba(0, 50, 30, 0.9)',
                            boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
                          }}
                        >
                          💚
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <span 
                      className={`flex-1 font-bold ${compact ? 'text-sm' : 'text-base'} truncate`}
                      style={{ 
                        color: '#ffd700',
                        textShadow: '0 0 8px rgba(255, 215, 0, 0.6), 0 1px 2px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      {user.display_name}
                    </span>

                    {/* Reward */}
                    <div className="flex items-center gap-2">
                      <img 
                        src={camlyCoin} 
                        alt="CAMLY" 
                        className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${index === 0 ? 'animate-coin-spin' : ''}`}
                        style={{ filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.8))' }}
                      />
                      <span 
                        className={`font-extrabold ${compact ? 'text-base' : 'text-lg'}`}
                        style={{
                          color: '#ffd700',
                          textShadow: `
                            0 0 10px rgba(255, 215, 0, 1),
                            0 0 20px rgba(255, 215, 0, 0.7),
                            0 2px 4px rgba(0, 0, 0, 0.8)
                          `,
                        }}
                      >
                        {formatNumber(user.total_reward)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Toggle button */}
          {!compact && topUsers.length > 5 && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                onClick={() => setShowAll(!showAll)}
                className="font-bold rounded-xl transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(184, 134, 11, 0.15))',
                  border: '2px solid rgba(255, 215, 0, 0.5)',
                  color: '#ffd700',
                  textShadow: '0 0 8px rgba(255, 215, 0, 0.6)',
                  boxShadow: '0 0 15px rgba(255, 215, 0, 0.3)',
                }}
              >
                {showAll ? "Thu gọn" : "Xem thêm"}
              </Button>
            </div>
          )}

          {/* View full leaderboard */}
          <div className="mt-4 flex justify-center">
            <Button
              onClick={() => navigate('/leaderboard')}
              className="font-bold rounded-xl transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #ffd700 0%, #b8860b 50%, #ffd700 100%)',
                color: '#0a2818',
                textShadow: '0 1px 0 rgba(255, 255, 255, 0.3)',
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                border: 'none',
              }}
            >
              🏆 Xem Bảng Xếp Hạng Đầy Đủ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopRanking;
