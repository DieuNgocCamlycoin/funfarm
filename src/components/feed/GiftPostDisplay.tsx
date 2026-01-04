import React, { useEffect, useRef, useState } from 'react';
import { Gift, Volume2, VolumeX, Sparkles, ArrowRight, Heart, Crown, Gem } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import camlyCoinImg from '@/assets/camly_coin.png';
import { getGiftLevel, parseAmountFromString, GiftLevel } from '@/lib/giftLevels';

// Custom sound effects saved locally
export const giftSoundOptions = [
  { id: 'rich1', name: 'Giàu Sang 1', url: '/sounds/gift-rich-1.mp3', emoji: '💰' },
  { id: 'rich2', name: 'Giàu Sang 2', url: '/sounds/gift-rich-2.mp3', emoji: '💎' },
  { id: 'rich3', name: 'Giàu Sang 3', url: '/sounds/gift-rich-3.mp3', emoji: '🎊' },
  { id: 'hearts', name: 'Lãng Mạn', url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', emoji: '💕' },
  { id: 'stars', name: 'Phép Màu', url: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', emoji: '✨' },
  { id: 'confetti', name: 'Tiệc Tùng', url: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', emoji: '🎉' },
  { id: 'coins', name: 'Tiền Vàng', url: 'https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3', emoji: '🪙' },
  { id: 'nature', name: 'Thiên Nhiên', url: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3', emoji: '🌿' },
  { id: 'sparkle', name: 'Lấp Lánh', url: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3', emoji: '🌟' },
];

// Gift templates matching CreateGiftPostModal
const giftTemplates = [
  { id: 'love', gradient: 'from-pink-500 via-rose-500 to-red-500', emoji: '💝', effect: 'hearts' },
  { id: 'romance', gradient: 'from-rose-400 via-pink-500 to-fuchsia-500', emoji: '💕', effect: 'hearts' },
  { id: 'kiss', gradient: 'from-red-400 via-rose-500 to-pink-400', emoji: '💋', effect: 'hearts' },
  { id: 'thanks', gradient: 'from-amber-400 via-orange-500 to-yellow-500', emoji: '🙏', effect: 'stars' },
  { id: 'appreciate', gradient: 'from-yellow-400 via-amber-500 to-orange-400', emoji: '🌟', effect: 'stars' },
  { id: 'congrats', gradient: 'from-green-400 via-emerald-500 to-teal-500', emoji: '🎉', effect: 'confetti' },
  { id: 'party', gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', emoji: '🎊', effect: 'confetti' },
  { id: 'fireworks', gradient: 'from-indigo-500 via-purple-600 to-pink-500', emoji: '🎆', effect: 'sparkle' },
  { id: 'support', gradient: 'from-blue-400 via-indigo-500 to-purple-500', emoji: '💪', effect: 'sparkle' },
  { id: 'cheer', gradient: 'from-cyan-400 via-blue-500 to-indigo-500', emoji: '📣', effect: 'sparkle' },
  { id: 'farm', gradient: 'from-green-500 via-lime-500 to-emerald-400', emoji: '🌾', effect: 'leaves' },
  { id: 'flower', gradient: 'from-pink-400 via-rose-400 to-red-300', emoji: '🌸', effect: 'petals' },
  { id: 'garden', gradient: 'from-emerald-400 via-green-500 to-teal-400', emoji: '🌻', effect: 'leaves' },
  { id: 'rainbow', gradient: 'from-red-400 via-yellow-400 to-green-400', emoji: '🌈', effect: 'rainbow' },
  { id: 'wealth', gradient: 'from-yellow-500 via-amber-500 to-orange-500', emoji: '💰', effect: 'coins' },
  { id: 'lucky', gradient: 'from-red-500 via-orange-500 to-yellow-500', emoji: '🧧', effect: 'coins' },
  { id: 'diamond', gradient: 'from-cyan-300 via-blue-400 to-indigo-400', emoji: '💎', effect: 'sparkle' },
  { id: 'birthday', gradient: 'from-fuchsia-500 via-pink-500 to-rose-400', emoji: '🎂', effect: 'confetti' },
  { id: 'gift', gradient: 'from-purple-500 via-violet-500 to-indigo-500', emoji: '🎁', effect: 'sparkle' },
  { id: 'star', gradient: 'from-amber-300 via-yellow-400 to-orange-400', emoji: '⭐', effect: 'stars' },
];

interface GiftPostDisplayProps {
  content: string;
  autoPlaySound?: boolean;
  customSoundId?: string;
  senderName?: string;
  senderWallet?: string;
  senderAvatar?: string;
  receiverName?: string;
  receiverWallet?: string;
  receiverAvatar?: string;
  giftAmount?: number;
  giftMessage?: string;
}

const GiftPostDisplay: React.FC<GiftPostDisplayProps> = ({ 
  content, 
  autoPlaySound = true, 
  customSoundId,
  senderName,
  senderWallet,
  senderAvatar,
  receiverName,
  receiverWallet,
  receiverAvatar,
  giftAmount,
  giftMessage 
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse gift info from content
  // Support formats like: "10000 CLC", "10.000 CLC", "10,000 CLC" (and crypto)
  const amountMatch = content.match(/(\d[\d\.,\s]*)\s*(CLC|CAMLY|BNB|USDT|BTCB)/i);
  const emojiMatch = content.match(/^(💝|💕|💋|🙏|🌟|🎉|🎊|🎆|💪|📣|🌾|🌸|🌻|🌈|💰|🧧|💎|🎂|🎁|⭐)/);

  // Parse custom message - use prop first, then content
  let customMessage = giftMessage || '';
  if (!customMessage) {
    const quotedMessageMatch = content.match(/"([^"]+)"/);
    customMessage = quotedMessageMatch ? quotedMessageMatch[1].trim() : '';
  }
  if (!customMessage) {
    const messageMatch = content.match(/kèm lời nhắn:\n\n?([^\n"]+)/);
    customMessage = messageMatch ? messageMatch[1].trim() : '';
  }

  // Truncate long message for display on card (max 80 chars)
  const truncatedMessage = customMessage.length > 80
    ? customMessage.substring(0, 80) + '...'
    : customMessage;

  // Parse sound ID from content if exists
  const soundIdMatch = content.match(/\[sound:(\w+)\]/);
  const parsedSoundId = soundIdMatch ? soundIdMatch[1] : customSoundId || 'rich1';

  const parsedAmount = (amountMatch?.[1] || '0').trim();
  const currency = amountMatch ? amountMatch[2].toUpperCase() : 'CAMLY';
  const emoji = emojiMatch ? emojiMatch[1] : '🎁';

  // Get gift level based on amount
  const numericAmount = (giftAmount ?? parseAmountFromString(parsedAmount)) || 0;
  const displayAmount = numericAmount.toLocaleString('vi-VN');
  const giftLevel = getGiftLevel(numericAmount);
  
  // Helper to shorten wallet address
  const shortenWallet = (address: string | undefined) => {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format number with thousands separator
  const formatNumber = (num: string) => {
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  // Find matching template
  const template = giftTemplates.find(t => t.emoji === emoji) || giftTemplates[giftTemplates.length - 1];

  // Play sound when component becomes visible
  useEffect(() => {
    if (!autoPlaySound || hasPlayed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasPlayed) {
            playSound();
            setHasPlayed(true);
            
            // Trigger screen shake for Diamond level
            if (giftLevel.effects.hasScreenShake) {
              triggerScreenShake();
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [autoPlaySound, hasPlayed, giftLevel]);

  const triggerScreenShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    // Repeat shake a few times
    let count = 0;
    const shakeInterval = setInterval(() => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
      count++;
      if (count >= 5) clearInterval(shakeInterval);
    }, 1500);
  };

  const playSound = () => {
    if (isMuted) return;
    
    // Use level-appropriate sound
    let soundUrl = giftLevel.sound;
    
    if (parsedSoundId) {
      const customSound = giftSoundOptions.find(s => s.id === parsedSoundId);
      if (customSound) soundUrl = customSound.url;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    audioRef.current = new Audio(soundUrl);
    audioRef.current.volume = 0.4;
    audioRef.current.loop = true; // Loop continuously - rich rich rich
    audioRef.current.play().catch(() => {
      console.log('Sound autoplay blocked');
    });
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) {
      if (newMuted) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
    }
  };

  // Level badge component
  const LevelBadge = () => {
    const icons: Record<GiftLevel, React.ReactNode> = {
      basic: <Heart className="w-3 h-3" />,
      silver: <Sparkles className="w-3 h-3" />,
      gold: <Crown className="w-3 h-3" />,
      diamond: <Gem className="w-3 h-3" />,
    };
    
    const bgColors: Record<GiftLevel, string> = {
      basic: 'from-pink-400 to-rose-500',
      silver: 'from-gray-300 to-gray-400',
      gold: 'from-yellow-400 to-amber-500',
      diamond: 'from-cyan-400 to-blue-500',
    };
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${bgColors[giftLevel.level]} text-white text-[10px] font-bold shadow-lg`}>
        {icons[giftLevel.level]}
        <span>{giftLevel.name}</span>
      </div>
    );
  };

  // Render animated particles based on level
  const renderLevelEffects = () => {
    const particles: React.ReactNode[] = [];
    
    // Basic: Gentle floating hearts
    if (giftLevel.level === 'basic') {
      for (let i = 0; i < 12; i++) {
        particles.push(
          <div
            key={`heart-${i}`}
            className="absolute text-lg pointer-events-none"
            style={{
              left: `${5 + i * 8}%`,
              bottom: `${10 + (i % 3) * 15}%`,
              animation: `floatUp ${4 + Math.random() * 2}s ease-out infinite`,
              animationDelay: `${i * 0.3}s`,
              opacity: 0.7,
            }}
          >
            {['💕', '❤️', '💖', '💗'][i % 4]}
          </div>
        );
      }
    }
    
    // Silver: Confetti + light coin rain
    if (giftLevel.level === 'silver') {
      // Confetti
      for (let i = 0; i < 20; i++) {
        const colors = ['#C0C0C0', '#E8E8E8', '#FFD700', '#FFA500'];
        particles.push(
          <div
            key={`confetti-${i}`}
            className="absolute w-2 h-2 rounded-sm pointer-events-none"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-5%`,
              backgroundColor: colors[i % colors.length],
              animation: `silverFall ${3 + Math.random() * 2}s linear infinite`,
              animationDelay: `${Math.random() * 2}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      }
      // Light coins
      for (let i = 0; i < 8; i++) {
        particles.push(
          <div
            key={`silver-coin-${i}`}
            className="absolute pointer-events-none"
            style={{
              left: `${10 + i * 11}%`,
              top: `-10%`,
              animation: `silverFall ${4 + Math.random() * 2}s linear infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            <img src={camlyCoinImg} alt="" className="w-5 h-5 animate-spin opacity-60" />
          </div>
        );
      }
    }
    
    // Gold: Fireworks + trumpet feel
    if (giftLevel.level === 'gold') {
      // Firework bursts
      const fireworkColors = ['#FFD700', '#FF6347', '#FF69B4', '#00CED1'];
      for (let i = 0; i < 6; i++) {
        const x = 15 + Math.random() * 70;
        const y = 10 + Math.random() * 40;
        particles.push(
          <div
            key={`firework-${i}`}
            className="absolute pointer-events-none"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animation: `fireworkBurst 2s ease-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            {[...Array(8)].map((_, j) => (
              <div
                key={j}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: fireworkColors[i % fireworkColors.length],
                  transform: `rotate(${j * 45}deg) translateY(-20px)`,
                  boxShadow: `0 0 8px ${fireworkColors[i % fireworkColors.length]}`,
                }}
              />
            ))}
          </div>
        );
      }
      // Golden sparkles
      for (let i = 0; i < 25; i++) {
        particles.push(
          <div
            key={`gold-sparkle-${i}`}
            className="absolute text-yellow-400 pointer-events-none"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: `${10 + Math.random() * 10}px`,
              animation: `sparkle ${1 + Math.random()}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          >
            ✦
          </div>
        );
      }
    }
    
    // Diamond: RICH RAIN - coins falling everywhere!
    if (giftLevel.level === 'diamond') {
      // Massive coin rain
      for (let i = 0; i < 30; i++) {
        const size = 20 + Math.random() * 20;
        particles.push(
          <div
            key={`diamond-coin-${i}`}
            className="absolute pointer-events-none"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-15%`,
              animation: `richRain ${2 + Math.random() * 3}s linear infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          >
            <img 
              src={camlyCoinImg} 
              alt="" 
              className="animate-spin"
              style={{ 
                width: size, 
                height: size,
                filter: 'drop-shadow(0 0 10px rgba(0,206,209,0.8))',
              }} 
            />
          </div>
        );
      }
      // Diamond sparkles
      for (let i = 0; i < 20; i++) {
        particles.push(
          <div
            key={`diamond-sparkle-${i}`}
            className="absolute pointer-events-none"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `diamondGlow 1.5s ease-in-out infinite`,
              animationDelay: `${Math.random() * 1.5}s`,
            }}
          >
            <Gem 
              className="text-cyan-300"
              style={{ 
                width: 12 + Math.random() * 12,
                filter: 'drop-shadow(0 0 8px rgba(0,206,209,0.9))',
              }}
            />
          </div>
        );
      }
    }
    
    return particles;
  };

  // Dynamic gradient based on level
  const getLevelGradient = () => {
    switch (giftLevel.level) {
      case 'diamond':
        return 'from-cyan-400 via-blue-500 to-indigo-600';
      case 'gold':
        return 'from-yellow-400 via-amber-500 to-orange-500';
      case 'silver':
        return 'from-gray-300 via-gray-400 to-gray-500';
      default:
        return template.gradient;
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${getLevelGradient()} p-1 text-white shadow-2xl mx-2 sm:mx-4 my-3 transition-transform ${isShaking ? 'animate-shake' : ''}`}
    >
      {/* Inner container with glass effect */}
      <div className="relative bg-black/20 backdrop-blur-sm rounded-xl p-4 sm:p-5">
        {/* Sound control button - prominent position */}
        <button
          onClick={toggleMute}
          className={`absolute top-3 right-3 z-20 rounded-full p-2.5 transition-all shadow-lg ${
            isMuted 
              ? 'bg-white/30 hover:bg-white/40' 
              : 'bg-white/40 hover:bg-white/50 ring-2 ring-white/50'
          }`}
          title={isMuted ? 'Bật âm thanh 🔊' : 'Tắt âm thanh 🔇'}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5 animate-pulse" />
          )}
        </button>

        {/* Level-specific animated effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
          {renderLevelEffects()}
          
          {/* Radial glow - intensity based on level */}
          <div 
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${giftLevel.colors.glow} 0%, transparent 60%)`,
              animation: 'pulse 2s infinite',
              opacity: giftLevel.level === 'diamond' ? 0.7 : giftLevel.level === 'gold' ? 0.5 : 0.3,
            }}
          />
        </div>

        {/* Header badge with Level indicator */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white/25 rounded-full px-4 py-1.5 backdrop-blur-md border border-white/30">
              <Gift className="w-5 h-5" />
              <span className="font-bold text-sm">Fun Farm Gift</span>
            </div>
            <LevelBadge />
          </div>
          <span className="text-4xl animate-bounce drop-shadow-lg">{giftLevel.emoji}</span>
        </div>

        {/* Main title - Celebration message with receiver avatar */}
        <div className="relative z-10 text-center mb-5">
          <div className="bg-white/20 rounded-2xl py-3 px-4 backdrop-blur-md border border-white/30">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xl">🎁</span>
              <Avatar className="w-6 h-6 border border-white/50 inline-flex">
                <AvatarImage src={receiverAvatar || ''} />
                <AvatarFallback className="bg-white/30 text-white text-xs">
                  {receiverName?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-lg sm:text-xl font-bold text-yellow-200">@{receiverName || 'Bạn'}</span>
              <span className="text-base sm:text-lg">vừa được</span>
              <Avatar className="w-6 h-6 border border-white/50 inline-flex">
                <AvatarImage src={senderAvatar || ''} />
                <AvatarFallback className="bg-white/30 text-white text-xs">
                  {senderName?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-lg sm:text-xl font-bold text-yellow-200">@{senderName || 'ai đó'}</span>
              <span className="text-base sm:text-lg">tặng</span>
            </div>
          </div>
        </div>

        {/* Sender → Receiver with avatars and wallets */}
        <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-6 my-5">
          {/* Sender */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-3 border-white/60 shadow-xl">
                <AvatarImage src={senderAvatar || ''} />
                <AvatarFallback className="bg-white/30 text-white text-lg font-bold">
                  {senderName?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white">
                <Gift className="w-3 h-3" />
              </div>
            </div>
            <span className="text-sm font-bold mt-2 max-w-[80px] truncate drop-shadow-md">
              {senderName || 'Người tặng'}
            </span>
            {senderWallet && (
              <span className="text-[10px] opacity-80 font-mono bg-black/30 px-2 py-0.5 rounded-full mt-1">
                {shortenWallet(senderWallet)}
              </span>
            )}
          </div>

          {/* Arrow with hearts */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-0.5">
              {['❤️', '💖', '❤️'].map((heart, i) => (
                <span 
                  key={i} 
                  className="text-sm animate-pulse"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  {heart}
                </span>
              ))}
            </div>
            <ArrowRight className="w-6 h-6 text-yellow-300 animate-pulse" />
            <span className="text-xs opacity-80 font-medium">tặng</span>
          </div>

          {/* Receiver */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar 
                className="w-14 h-14 sm:w-16 sm:h-16 border-3 border-white/60 shadow-xl"
                style={{
                  boxShadow: giftLevel.level === 'diamond' 
                    ? '0 0 20px rgba(0,206,209,0.8), 0 0 40px rgba(0,206,209,0.4)' 
                    : giftLevel.level === 'gold'
                    ? '0 0 15px rgba(255,215,0,0.6)'
                    : undefined,
                }}
              >
                <AvatarImage src={receiverAvatar || ''} />
                <AvatarFallback className="bg-white/30 text-white text-lg font-bold">
                  {receiverName?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1 border-2 border-white">
                <Sparkles className="w-3 h-3" />
              </div>
            </div>
            <span className="text-sm font-bold mt-2 max-w-[80px] truncate drop-shadow-md">
              {receiverName || 'Người nhận'}
            </span>
            {receiverWallet && (
              <span className="text-[10px] opacity-80 font-mono bg-black/30 px-2 py-0.5 rounded-full mt-1">
                {shortenWallet(receiverWallet)}
              </span>
            )}
          </div>
        </div>

        {/* BIG Amount with spinning coin - CENTERPIECE */}
        <div className="relative z-10 text-center my-5">
          <div 
            className="rounded-2xl py-5 px-6 backdrop-blur-md border-2 shadow-xl"
            style={{
              background: `linear-gradient(135deg, ${giftLevel.colors.primary}40, ${giftLevel.colors.secondary}50)`,
              borderColor: `${giftLevel.colors.primary}80`,
              boxShadow: `0 0 30px ${giftLevel.colors.glow}`,
            }}
          >
            <div className="flex items-center justify-center gap-4">
              {/* Spinning coin with level glow */}
              <div className="relative">
                <img 
                  src={camlyCoinImg} 
                  alt="coin" 
                  className={`w-14 h-14 sm:w-16 sm:h-16 drop-shadow-lg ${giftLevel.level === 'diamond' ? 'animate-spin' : ''}`}
                  style={{ 
                    animation: giftLevel.level === 'diamond' ? 'spin 1s linear infinite' : 'spin 3s linear infinite',
                    filter: `drop-shadow(0 0 15px ${giftLevel.colors.glow})`,
                  }} 
                />
                <div 
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle, ${giftLevel.colors.glow} 0%, transparent 70%)`,
                    animation: 'pulse 1s infinite',
                  }}
                />
              </div>
              
              {/* Amount number - LARGE */}
              <div className="flex flex-col items-start">
                <span 
                  className="text-4xl sm:text-5xl font-black drop-shadow-lg"
                  style={{
                    textShadow: `0 0 20px ${giftLevel.colors.glow}, 2px 2px 0 rgba(0,0,0,0.3)`,
                    background: `linear-gradient(180deg, #fff 0%, ${giftLevel.colors.primary} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {displayAmount}
                </span>
                <span className="text-sm font-bold opacity-90 tracking-wider">
                  {currency === 'CAMLY' || currency === 'CLC' ? 'CAMLY COIN' : currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Message - Highlighted (truncated on card) */}
        {truncatedMessage && (
          <div className="relative z-10 mt-4">
            <div className="bg-white/25 rounded-xl p-4 backdrop-blur-md border border-white/30">
              <div className="flex items-start gap-2">
                <span className="text-2xl">💬</span>
                <p className="text-base sm:text-lg font-medium italic leading-relaxed">
                  "{truncatedMessage}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer with Rich Rich Rich */}
        <div className="relative z-10 mt-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-2 backdrop-blur-sm">
            <span className="text-xl animate-bounce" style={{ animationDelay: '0s' }}>💰</span>
            <span className="font-bold text-sm tracking-wide">Rich Rich Rich!</span>
            <span className="text-xl animate-bounce" style={{ animationDelay: '0.2s' }}>💎</span>
          </div>
        </div>
      </div>

      {/* Text content with icons below the card */}
      <div className="px-4 py-3 bg-gradient-to-r from-transparent via-white/5 to-transparent">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🎁</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/90 leading-relaxed">
              <span className="font-semibold text-yellow-300">@{receiverName || 'Người nhận'}</span>
              {' '}vừa được{' '}
              <span className="font-semibold text-yellow-300">@{senderName || 'Người tặng'}</span>
              {' '}tặng{' '}
              <span className="font-bold text-green-300">{displayAmount} {currency}</span>
              {customMessage && (
                <>
                  {' '}kèm lời nhắn: 
                  <span className="italic text-white/80"> "{customMessage.length > 100 ? customMessage.substring(0, 100) + '...' : customMessage}"</span>
                </>
              )}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-white/60">
              <span>💝 Yêu thương</span>
              <span>•</span>
              <span>🌾 FUN FARM</span>
              <span>•</span>
              <span>✨ {giftLevel.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations for all levels */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.7;
          }
          100% {
            transform: translateY(-300px) scale(1.2);
            opacity: 0;
          }
        }
        
        @keyframes silverFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.8;
          }
          100% {
            transform: translateY(500px) rotate(720deg);
            opacity: 0;
          }
        }
        
        @keyframes richRain {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(600px) rotate(1080deg);
            opacity: 0.5;
          }
        }
        
        @keyframes fireworkBurst {
          0%, 100% {
            transform: scale(0);
            opacity: 0;
          }
          20% {
            transform: scale(1.2);
            opacity: 1;
          }
          80% {
            transform: scale(1.5);
            opacity: 0.5;
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1) rotate(180deg);
            opacity: 1;
          }
        }
        
        @keyframes diamondGlow {
          0%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.8;
          }
          100% {
            transform: translateY(400px) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
};

export default GiftPostDisplay;
