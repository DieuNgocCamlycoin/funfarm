import React, { useEffect, useRef, useState } from 'react';
import { Gift, Volume2, VolumeX, Sparkles, ArrowRight } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import camlyCoinImg from '@/assets/camly_coin.png';

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
  receiverAvatar 
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse gift info from content
  const amountMatch = content.match(/(\d{1,3}(?:[\.,]\d{3})*)\s*(CLC|CAMLY|BNB|USDT|BTCB)/i);
  const emojiMatch = content.match(/^(💝|💕|💋|🙏|🌟|🎉|🎊|🎆|💪|📣|🌾|🌸|🌻|🌈|💰|🧧|💎|🎂|🎁|⭐)/);
  
  // Parse custom message - look for quoted text first "..."
  const quotedMessageMatch = content.match(/"([^"]+)"/);
  let customMessage = quotedMessageMatch ? quotedMessageMatch[1].trim() : '';
  
  // If no quoted message, try to extract from between lines
  if (!customMessage) {
    const messageMatch = content.match(/kèm lời nhắn:\n\n?([^\n"]+)/);
    customMessage = messageMatch ? messageMatch[1].trim() : '';
  }
  
  // Parse sound ID from content if exists
  const soundIdMatch = content.match(/\[sound:(\w+)\]/);
  const parsedSoundId = soundIdMatch ? soundIdMatch[1] : customSoundId || 'rich1';
  
  const amount = amountMatch ? amountMatch[1] : '0';
  const currency = amountMatch ? amountMatch[2].toUpperCase() : 'CAMLY';
  const emoji = emojiMatch ? emojiMatch[1] : '🎁';
  
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
          }
        });
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [autoPlaySound, hasPlayed]);

  const playSound = () => {
    if (isMuted) return;
    
    // Default to rich sound that loops
    let soundUrl = '/sounds/gift-rich-1.mp3';
    
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

  // Render animated particles based on effect type
  const renderEffectParticles = () => {
    const particles = [];
    
    // Sparkle/star particles for all templates
    for (let i = 0; i < 25; i++) {
      const size = 2 + Math.random() * 6;
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const delay = Math.random() * 3;
      const duration = 1 + Math.random() * 2;
      
      particles.push(
        <div
          key={`sparkle-${i}`}
          className="absolute rounded-full bg-white"
          style={{
            width: size,
            height: size,
            left: `${left}%`,
            top: `${top}%`,
            opacity: 0.4 + Math.random() * 0.4,
            animation: `pulse ${duration}s infinite`,
            animationDelay: `${delay}s`,
            boxShadow: '0 0 6px 2px rgba(255,255,255,0.5)',
          }}
        />
      );
    }

    // Gold confetti falling
    for (let i = 0; i < 15; i++) {
      particles.push(
        <div
          key={`confetti-${i}`}
          className="absolute text-yellow-400"
          style={{
            left: `${5 + i * 7}%`,
            top: `${-10 + (i % 4) * 10}%`,
            fontSize: `${12 + Math.random() * 8}px`,
            animation: `fall ${3 + Math.random() * 2}s linear infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        >
          ✦
        </div>
      );
    }

    // Effect-specific particles
    if (template.effect === 'hearts') {
      for (let i = 0; i < 10; i++) {
        particles.push(
          <div
            key={`heart-${i}`}
            className="absolute text-xl opacity-50"
            style={{
              left: `${5 + i * 10}%`,
              top: `${20 + (i % 4) * 20}%`,
              animation: `float ${2 + Math.random()}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          >
            ❤️
          </div>
        );
      }
    }

    if (template.effect === 'coins') {
      for (let i = 0; i < 12; i++) {
        particles.push(
          <div
            key={`coin-${i}`}
            className="absolute text-xl opacity-60"
            style={{
              left: `${8 + i * 8}%`,
              top: `${15 + (i % 4) * 22}%`,
              animation: `spin ${2 + Math.random()}s linear infinite, float ${3 + Math.random()}s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`,
            }}
          >
            🪙
          </div>
        );
      }
    }

    if (template.effect === 'confetti') {
      const confettiEmojis = ['🎊', '🎉', '🎈', '✨', '🌟', '⭐'];
      for (let i = 0; i < 15; i++) {
        particles.push(
          <div
            key={`party-${i}`}
            className="absolute text-lg opacity-70"
            style={{
              left: `${3 + i * 7}%`,
              top: `${5 + (i % 5) * 20}%`,
              animation: `bounce ${1 + Math.random() * 0.5}s infinite`,
              animationDelay: `${i * 0.1}s`,
            }}
          >
            {confettiEmojis[i % confettiEmojis.length]}
          </div>
        );
      }
    }

    return particles;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${template.gradient} p-1 text-white shadow-2xl mx-2 sm:mx-4 my-3`}
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

        {/* Animated background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
          {renderEffectParticles()}
          
          {/* Radial glow */}
          <div 
            className="absolute inset-0 opacity-40"
            style={{
              background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.5) 0%, transparent 60%)',
              animation: 'pulse 2s infinite',
            }}
          />
        </div>

        {/* Header badge */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 bg-white/25 rounded-full px-4 py-1.5 backdrop-blur-md border border-white/30">
            <Gift className="w-5 h-5" />
            <span className="font-bold text-sm">Fun Farm Gift</span>
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <span className="text-4xl animate-bounce drop-shadow-lg">{template.emoji}</span>
        </div>

        {/* Main title - Celebration message */}
        <div className="relative z-10 text-center mb-5">
          <div className="bg-white/20 rounded-2xl py-3 px-4 backdrop-blur-md border border-white/30">
            <p className="text-lg sm:text-xl font-bold leading-relaxed drop-shadow-md">
              🎁 <span className="text-yellow-200">@{receiverName || 'Bạn'}</span> vừa được{' '}
              <span className="text-yellow-200">@{senderName || 'ai đó'}</span> tặng
            </p>
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
              <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-3 border-white/60 shadow-xl ring-4 ring-yellow-400/50">
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
          <div className="bg-gradient-to-r from-yellow-400/30 via-amber-300/40 to-yellow-400/30 rounded-2xl py-5 px-6 backdrop-blur-md border-2 border-yellow-300/50 shadow-xl">
            <div className="flex items-center justify-center gap-4">
              {/* Spinning coin */}
              <div className="relative">
                <img 
                  src={camlyCoinImg} 
                  alt="coin" 
                  className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-lg"
                  style={{ 
                    animation: 'spin 2s linear infinite',
                    filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.7))',
                  }} 
                />
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)',
                    animation: 'pulse 1s infinite',
                  }}
                />
              </div>
              
              {/* Amount number - LARGE */}
              <div className="flex flex-col items-start">
                <span 
                  className="text-4xl sm:text-5xl font-black drop-shadow-lg"
                  style={{
                    textShadow: '0 0 20px rgba(255,255,255,0.5), 2px 2px 0 rgba(0,0,0,0.3)',
                    background: 'linear-gradient(180deg, #fff 0%, #ffd700 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {formatNumber(amount)}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-yellow-200 drop-shadow-md">
                  {currency === 'CLC' ? 'CAMLY' : currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Custom message - highlighted */}
        {customMessage && (
          <div className="relative z-10 text-center mb-4">
            <div className="bg-white/15 rounded-xl py-3 px-5 backdrop-blur-sm border border-white/20">
              <p className="text-base sm:text-lg italic font-medium drop-shadow-md">
                💬 "{customMessage}"
              </p>
            </div>
          </div>
        )}

        {/* Footer decoration */}
        <div className="relative z-10 flex items-center justify-center gap-2 pt-2 opacity-90">
          <div className="flex">
            {['🌟', '💖', '✨'].map((emoji, i) => (
              <span 
                key={i} 
                className="text-lg animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                {emoji}
              </span>
            ))}
          </div>
          <span className="text-xs font-medium bg-white/20 px-3 py-1 rounded-full border border-white/30">
            🌱 with love from Fun Farm
          </span>
          <div className="flex">
            {['✨', '💖', '🌟'].map((emoji, i) => (
              <span 
                key={i} 
                className="text-lg animate-bounce"
                style={{ animationDelay: `${i * 0.15 + 0.3}s` }}
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
};

export default GiftPostDisplay;
