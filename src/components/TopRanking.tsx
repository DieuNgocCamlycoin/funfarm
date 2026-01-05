// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Top Ranking - Bảng xếp hạng Thiên Thần - Angel Design

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

// Angel Wings SVG Component - Cánh thiên thần kim loại lông vũ
const AngelWings = ({ rank }: { rank: number }) => {
  const colors = {
    1: { primary: '#ffd700', secondary: '#ffec8b', glow: 'rgba(255, 215, 0, 0.8)' },
    2: { primary: '#c0c0c0', secondary: '#e8e8e8', glow: 'rgba(192, 192, 192, 0.7)' },
    3: { primary: '#cd7f32', secondary: '#daa06d', glow: 'rgba(205, 127, 50, 0.7)' },
  };
  const color = colors[rank as keyof typeof colors];
  const scale = rank === 1 ? 1.15 : rank === 2 ? 1 : 0.9;

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-0"
      style={{ 
        filter: `drop-shadow(0 0 12px ${color.glow})`,
        transform: `scale(${scale})`,
      }}
    >
      {/* Left Wing - Lông vũ chi tiết */}
      <svg 
        className="absolute -left-10 top-1/2 -translate-y-1/2"
        width="50" 
        height="80" 
        viewBox="0 0 50 80"
        style={{ transform: 'translateY(-50%) scaleX(-1)' }}
      >
        <defs>
          <linearGradient id={`wingGrad${rank}L`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color.secondary} />
            <stop offset="50%" stopColor={color.primary} />
            <stop offset="100%" stopColor={color.secondary} />
          </linearGradient>
        </defs>
        {/* Lông vũ chính */}
        <path d="M45 40 Q35 30 30 15 Q28 25 25 35 Q20 20 18 10 Q17 25 15 38 Q10 25 8 18 Q9 32 10 42 Q5 35 2 30 Q5 42 10 50 Q5 55 2 65 Q10 58 15 55 Q12 65 10 75 Q18 65 22 55 Q25 68 28 78 Q30 65 32 52 Q38 65 42 72 Q38 55 35 45 Q42 52 48 58 Q42 48 45 40Z" 
          fill={`url(#wingGrad${rank}L)`}
          stroke={color.primary}
          strokeWidth="0.5"
          opacity="0.95"
        />
        {/* Highlight lines */}
        <path d="M40 38 Q30 30 25 20" stroke={color.secondary} strokeWidth="1" fill="none" opacity="0.6"/>
        <path d="M35 42 Q25 38 20 30" stroke={color.secondary} strokeWidth="0.8" fill="none" opacity="0.5"/>
        <path d="M30 48 Q20 45 15 40" stroke={color.secondary} strokeWidth="0.6" fill="none" opacity="0.4"/>
      </svg>
      
      {/* Right Wing - Mirror */}
      <svg 
        className="absolute -right-10 top-1/2 -translate-y-1/2"
        width="50" 
        height="80" 
        viewBox="0 0 50 80"
        style={{ transform: 'translateY(-50%)' }}
      >
        <defs>
          <linearGradient id={`wingGrad${rank}R`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color.secondary} />
            <stop offset="50%" stopColor={color.primary} />
            <stop offset="100%" stopColor={color.secondary} />
          </linearGradient>
        </defs>
        <path d="M45 40 Q35 30 30 15 Q28 25 25 35 Q20 20 18 10 Q17 25 15 38 Q10 25 8 18 Q9 32 10 42 Q5 35 2 30 Q5 42 10 50 Q5 55 2 65 Q10 58 15 55 Q12 65 10 75 Q18 65 22 55 Q25 68 28 78 Q30 65 32 52 Q38 65 42 72 Q38 55 35 45 Q42 52 48 58 Q42 48 45 40Z" 
          fill={`url(#wingGrad${rank}R)`}
          stroke={color.primary}
          strokeWidth="0.5"
          opacity="0.95"
        />
        <path d="M40 38 Q30 30 25 20" stroke={color.secondary} strokeWidth="1" fill="none" opacity="0.6"/>
        <path d="M35 42 Q25 38 20 30" stroke={color.secondary} strokeWidth="0.8" fill="none" opacity="0.5"/>
        <path d="M30 48 Q20 45 15 40" stroke={color.secondary} strokeWidth="0.6" fill="none" opacity="0.4"/>
      </svg>
    </div>
  );
};

// Crown SVG Component - Vương miện theo cấp độ
const CrownIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    // Top 1: Vương miện vàng 5 đỉnh, đính ngọc, lộng lẫy
    return (
      <svg width="36" height="28" viewBox="0 0 36 28" className="absolute -top-6 left-1/2 -translate-x-1/2 z-30">
        <defs>
          <linearGradient id="crownGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffec8b" />
            <stop offset="30%" stopColor="#ffd700" />
            <stop offset="70%" stopColor="#daa520" />
            <stop offset="100%" stopColor="#ffd700" />
          </linearGradient>
          <filter id="crownGlow1">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Crown base */}
        <path 
          d="M3 24 L6 10 L11 16 L18 4 L25 16 L30 10 L33 24 Z" 
          fill="url(#crownGold)" 
          stroke="#b8860b" 
          strokeWidth="1"
          filter="url(#crownGlow1)"
        />
        {/* Crown band */}
        <rect x="5" y="22" width="26" height="4" rx="1" fill="url(#crownGold)" stroke="#b8860b" strokeWidth="0.5"/>
        {/* Gems - Ruby center */}
        <circle cx="18" cy="8" r="2.5" fill="#dc143c" stroke="#8b0000" strokeWidth="0.5">
          <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>
        </circle>
        {/* Gems - Sapphire sides */}
        <circle cx="11" cy="14" r="1.8" fill="#4169e1" stroke="#191970" strokeWidth="0.5"/>
        <circle cx="25" cy="14" r="1.8" fill="#4169e1" stroke="#191970" strokeWidth="0.5"/>
        {/* Small diamonds */}
        <circle cx="7" cy="18" r="1" fill="#ffffff" opacity="0.9"/>
        <circle cx="29" cy="18" r="1" fill="#ffffff" opacity="0.9"/>
      </svg>
    );
  } else if (rank === 2) {
    // Top 2: Vương miện bạc 3 đỉnh, tinh tế
    return (
      <svg width="28" height="22" viewBox="0 0 28 22" className="absolute -top-5 left-1/2 -translate-x-1/2 z-30">
        <defs>
          <linearGradient id="crownSilver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5f5f5" />
            <stop offset="50%" stopColor="#c0c0c0" />
            <stop offset="100%" stopColor="#e8e8e8" />
          </linearGradient>
          <filter id="crownGlow2">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path 
          d="M3 18 L7 8 L14 4 L21 8 L25 18 Z" 
          fill="url(#crownSilver)" 
          stroke="#a9a9a9" 
          strokeWidth="1"
          filter="url(#crownGlow2)"
        />
        <rect x="4" y="17" width="20" height="3" rx="1" fill="url(#crownSilver)" stroke="#a9a9a9" strokeWidth="0.5"/>
        {/* Pearl center */}
        <circle cx="14" cy="8" r="2" fill="#f0f0f0" stroke="#d3d3d3" strokeWidth="0.5"/>
        <circle cx="8" cy="12" r="1.2" fill="#e0e0e0"/>
        <circle cx="20" cy="12" r="1.2" fill="#e0e0e0"/>
      </svg>
    );
  } else {
    // Top 3: Vương miện đồng đơn giản, thanh lịch
    return (
      <svg width="24" height="18" viewBox="0 0 24 18" className="absolute -top-4 left-1/2 -translate-x-1/2 z-30">
        <defs>
          <linearGradient id="crownBronze" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#daa06d" />
            <stop offset="50%" stopColor="#cd7f32" />
            <stop offset="100%" stopColor="#b8860b" />
          </linearGradient>
          <filter id="crownGlow3">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path 
          d="M3 14 L6 6 L12 3 L18 6 L21 14 Z" 
          fill="url(#crownBronze)" 
          stroke="#8b4513" 
          strokeWidth="0.8"
          filter="url(#crownGlow3)"
        />
        <rect x="4" y="13" width="16" height="3" rx="1" fill="url(#crownBronze)" stroke="#8b4513" strokeWidth="0.5"/>
        <circle cx="12" cy="7" r="1.5" fill="#daa06d" stroke="#8b4513" strokeWidth="0.3"/>
      </svg>
    );
  }
};

// Halo Component - Vòng sáng thiên thần cho Top 4-10
const Halo = () => {
  return (
    <div 
      className="absolute -top-3 left-1/2 -translate-x-1/2 z-30"
      style={{
        width: '40px',
        height: '12px',
        background: 'linear-gradient(90deg, transparent, rgba(255, 223, 100, 0.9), transparent)',
        borderRadius: '50%',
        boxShadow: '0 0 15px rgba(255, 215, 0, 0.7), 0 0 25px rgba(255, 215, 0, 0.4)',
        animation: 'pulse 2s ease-in-out infinite',
      }}
    >
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          border: '2px solid rgba(255, 215, 0, 0.6)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
};

// Sparkle particles
const SparkleParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
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
              background: p.type === 0 ? '#ffffff' : p.type === 1 ? '#ffd700' : p.type === 2 ? '#ffec8b' : '#fff8dc',
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
      className="relative overflow-hidden rounded-[20px] p-1 main-board-glow cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, #ffd700 0%, #b8860b 25%, #ffd700 50%, #daa520 75%, #ffd700 100%)',
        boxShadow: '0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.3)',
      }}
    >
      {/* Inner container with Divine Paradise background */}
      <div 
        className="relative overflow-hidden rounded-[16px]"
        style={{
          background: 'linear-gradient(160deg, #1a472a 0%, #0d3320 20%, #0a2818 40%, #071f14 60%, #0a2818 80%, #0d3320 100%)',
        }}
      >
        {/* Divine light rays from top */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255, 223, 100, 0.25) 0%, transparent 60%),
              radial-gradient(ellipse at 20% 20%, rgba(0, 100, 180, 0.2) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, rgba(184, 134, 11, 0.2) 0%, transparent 50%)
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
            className={`text-center font-extrabold ${compact ? 'text-xl' : 'text-2xl md:text-3xl'} tracking-[0.15em] mb-6`}
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
            ✨ TOP RANKING ✨
          </h2>

          {/* User List - Vertical Cards */}
          <div className="space-y-4">
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
              displayedUsers.map((user, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                const isTop10 = rank >= 4 && rank <= 10;
                
                return (
                  <div
                    key={user.id}
                    className="relative overflow-visible rounded-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                    style={{
                      background: isTop3 
                        ? 'linear-gradient(135deg, rgba(20, 50, 30, 0.95) 0%, rgba(10, 35, 20, 0.98) 100%)'
                        : 'linear-gradient(135deg, rgba(10, 40, 24, 0.9) 0%, rgba(7, 31, 20, 0.95) 100%)',
                      border: `2px solid ${isTop3 ? 'rgba(255, 215, 0, 0.7)' : 'rgba(255, 215, 0, 0.4)'}`,
                      boxShadow: isTop3
                        ? '0 0 25px rgba(255, 215, 0, 0.5), inset 0 0 15px rgba(255, 215, 0, 0.15)'
                        : '0 0 15px rgba(255, 215, 0, 0.2), inset 0 0 10px rgba(255, 215, 0, 0.08)',
                    }}
                    onClick={() => navigate(`/user/${user.id}`)}
                  >
                    <div className={`flex flex-col items-center ${compact ? 'py-4 px-3' : 'py-5 px-4'}`}>
                      {/* Crown for Top 1-3 */}
                      {isTop3 && <CrownIcon rank={rank} />}
                      
                      {/* Halo for Top 4-10 */}
                      {isTop10 && <Halo />}
                      
                      {/* Avatar Container with Wings */}
                      <div className={`relative ${compact ? 'w-14 h-14' : 'w-16 h-16'} ${isTop3 ? 'mt-2' : 'mt-1'}`}>
                        {/* Angel Wings for Top 1-3 */}
                        {isTop3 && <AngelWings rank={rank} />}
                        
                        {/* Avatar */}
                        <Avatar 
                          className={`relative z-10 ${compact ? 'w-14 h-14' : 'w-16 h-16'}`}
                          style={{
                            border: `3px solid ${rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'rgba(255, 215, 0, 0.5)'}`,
                            boxShadow: `0 0 20px ${rank === 1 ? 'rgba(255, 215, 0, 0.9)' : rank === 2 ? 'rgba(192, 192, 192, 0.7)' : rank === 3 ? 'rgba(205, 127, 50, 0.7)' : 'rgba(255, 215, 0, 0.3)'}`,
                          }}
                        >
                          <AvatarImage src={user.avatar_url || funFarmLogo} />
                          <AvatarFallback 
                            className="font-bold text-lg"
                            style={{
                              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(184, 134, 11, 0.2))',
                              color: '#ffd700',
                            }}
                          >
                            {user.display_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Good heart badge */}
                        {user.is_good_heart && (
                          <div 
                            className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs z-20"
                            style={{
                              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                              border: '2px solid rgba(0, 50, 30, 0.9)',
                              boxShadow: '0 0 10px rgba(34, 197, 94, 0.7)',
                            }}
                          >
                            💚
                          </div>
                        )}
                        
                        {/* Rank badge */}
                        <div 
                          className="absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs z-20"
                          style={{
                            background: rank === 1 
                              ? 'linear-gradient(135deg, #ffd700, #b8860b)' 
                              : rank === 2 
                              ? 'linear-gradient(135deg, #e8e8e8, #a9a9a9)'
                              : rank === 3
                              ? 'linear-gradient(135deg, #daa06d, #8b4513)'
                              : 'linear-gradient(135deg, rgba(255, 215, 0, 0.5), rgba(184, 134, 11, 0.4))',
                            color: rank <= 3 ? '#1a1a1a' : '#ffd700',
                            border: '2px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                          }}
                        >
                          {rank}
                        </div>
                      </div>

                      {/* Name - Now below avatar, clearly visible */}
                      <span 
                        className={`font-bold ${compact ? 'text-sm mt-2' : 'text-base mt-3'} text-center max-w-full px-2`}
                        style={{ 
                          color: '#ffd700',
                          textShadow: '0 0 10px rgba(255, 215, 0, 0.7), 0 1px 2px rgba(0, 0, 0, 0.8)',
                        }}
                      >
                        {user.display_name}
                      </span>

                      {/* Reward - Below name */}
                      <div className="flex items-center gap-2 mt-1">
                        <img 
                          src={camlyCoin} 
                          alt="CAMLY" 
                          className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${rank === 1 ? 'animate-coin-spin' : ''}`}
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
                );
              })
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
