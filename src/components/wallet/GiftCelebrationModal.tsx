import React, { useEffect, useState, useRef } from 'react';
import Confetti from 'react-confetti';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, Sparkles, PartyPopper, Crown, Gem } from 'lucide-react';
import camlyCoinImg from '@/assets/camly_coin.png';
import { getGiftLevel, GiftLevel } from '@/lib/giftLevels';

interface GiftCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency: string;
  senderName: string;
  senderAvatar: string | null;
  receiverName: string;
  receiverAvatar: string | null;
  message?: string;
  onCreatePost?: () => void;
}

// Flying coin for Rich Rain effect
const RichRainCoin = ({ delay, startX, size }: { delay: number; startX: number; size: number }) => (
  <div
    className="absolute pointer-events-none z-50"
    style={{
      left: `${startX}%`,
      top: '-50px',
      animation: `richRainFall 2s ease-in ${delay}s forwards`,
    }}
  >
    <img src={camlyCoinImg} alt="coin" className="animate-spin" style={{ width: size, height: size }} />
  </div>
);

// Flying hearts for Basic level
const FlyingHeart = ({ delay, startX }: { delay: number; startX: number }) => (
  <div
    className="absolute pointer-events-none text-2xl"
    style={{
      left: `${startX}%`,
      bottom: '10%',
      animation: `floatUp 4s ease-out ${delay}s forwards`,
      opacity: 0.8,
    }}
  >
    {['💕', '❤️', '💖', '💗'][Math.floor(Math.random() * 4)]}
  </div>
);

// Firework burst
const FireworkBurst = ({ x, y, color, delay }: { x: number; y: number; color: string; delay: number }) => (
  <div
    className="absolute pointer-events-none"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      animation: `fireworkExplode 1s ease-out ${delay}s forwards`,
    }}
  >
    {[...Array(12)].map((_, i) => (
      <div
        key={i}
        className="absolute w-2 h-2 rounded-full"
        style={{
          backgroundColor: color,
          transform: `rotate(${i * 30}deg) translateY(-30px)`,
          animation: `fireworkParticle 1s ease-out ${delay}s forwards`,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
    ))}
  </div>
);

const GiftCelebrationModal: React.FC<GiftCelebrationModalProps> = ({
  isOpen,
  onClose,
  amount,
  currency,
  senderName,
  senderAvatar,
  receiverName,
  receiverAvatar,
  message,
  onCreatePost,
}) => {
  const [windowSize, setWindowSize] = useState({ width: 400, height: 600 });
  const [showConfetti, setShowConfetti] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const giftLevel = getGiftLevel(amount);
  const levelConfig = giftLevel;

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      // Play level-appropriate sound
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(levelConfig.sound);
      audioRef.current.volume = 0.4;
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {});

      // Screen shake for Diamond level
      if (levelConfig.effects.hasScreenShake) {
        setIsShaking(true);
        const shakeInterval = setInterval(() => {
          setIsShaking(prev => !prev);
        }, 100);
        setTimeout(() => {
          clearInterval(shakeInterval);
          setIsShaking(false);
        }, 3000);
      }

      // Stop confetti after duration
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, levelConfig.effects.duration);

      return () => {
        clearTimeout(timer);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }
  }, [isOpen, levelConfig]);

  const formatNumber = (num: number) => {
    return num.toLocaleString('vi-VN');
  };

  // Generate elements based on level
  const generateLevelEffects = () => {
    const elements: React.ReactNode[] = [];
    
    // Basic: Floating hearts
    if (levelConfig.level === 'basic') {
      for (let i = 0; i < 15; i++) {
        elements.push(
          <FlyingHeart key={`heart-${i}`} delay={Math.random() * 3} startX={Math.random() * 100} />
        );
      }
    }
    
    // Silver: Confetti + light coins
    if (levelConfig.level === 'silver') {
      for (let i = 0; i < 20; i++) {
        elements.push(
          <div
            key={`silver-coin-${i}`}
            className="absolute pointer-events-none"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-20px',
              animation: `silverFall 3s ease-in ${Math.random() * 2}s forwards`,
            }}
          >
            <img src={camlyCoinImg} alt="coin" className="w-6 h-6 animate-spin opacity-70" />
          </div>
        );
      }
    }
    
    // Gold: Fireworks
    if (levelConfig.effects.hasFireworks) {
      const fireworkColors = ['#FFD700', '#FF6347', '#00CED1', '#FF69B4', '#98FB98'];
      for (let i = 0; i < 8; i++) {
        elements.push(
          <FireworkBurst
            key={`firework-${i}`}
            x={10 + Math.random() * 80}
            y={10 + Math.random() * 50}
            color={fireworkColors[i % fireworkColors.length]}
            delay={Math.random() * 2}
          />
        );
      }
    }
    
    // Diamond: Rich Rain
    if (levelConfig.effects.hasRichRain) {
      for (let i = 0; i < 50; i++) {
        const size = 24 + Math.random() * 24;
        elements.push(
          <RichRainCoin
            key={`rich-${i}`}
            delay={Math.random() * 5}
            startX={Math.random() * 100}
            size={size}
          />
        );
      }
    }
    
    return elements;
  };

  // Level badge component
  const LevelBadge = () => {
    const icons: Record<GiftLevel, React.ReactNode> = {
      basic: <Heart className="w-4 h-4" />,
      silver: <Sparkles className="w-4 h-4" />,
      gold: <Crown className="w-4 h-4" />,
      diamond: <Gem className="w-4 h-4" />,
    };
    
    const bgColors: Record<GiftLevel, string> = {
      basic: 'from-pink-400 to-rose-500',
      silver: 'from-gray-300 to-gray-400',
      gold: 'from-yellow-400 to-amber-500',
      diamond: 'from-cyan-400 to-blue-500',
    };
    
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${bgColors[levelConfig.level]} text-white text-xs font-bold shadow-lg`}>
        {icons[levelConfig.level]}
        <span>{levelConfig.name}</span>
        <span>{levelConfig.emoji}</span>
      </div>
    );
  };

  const confettiColors = levelConfig.level === 'diamond' 
    ? ['#00CED1', '#E0FFFF', '#87CEEB', '#ADD8E6', '#B0E0E6', '#AFEEEE']
    : levelConfig.level === 'gold'
    ? ['#FFD700', '#FFA500', '#FF8C00', '#DAA520', '#B8860B']
    : levelConfig.level === 'silver'
    ? ['#C0C0C0', '#D3D3D3', '#A9A9A9', '#808080', '#DCDCDC']
    : ['#FF69B4', '#FFB6C1', '#FFC0CB', '#DB7093', '#FF1493'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`sm:max-w-md overflow-hidden border-0 bg-gradient-to-b from-primary/20 via-background to-background transition-transform ${isShaking ? 'animate-shake' : ''}`}
      >
        {/* Confetti - different intensity per level */}
        {showConfetti && (
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={levelConfig.level === 'diamond'}
            numberOfPieces={levelConfig.effects.particleCount}
            gravity={levelConfig.level === 'diamond' ? 0.15 : 0.2}
            colors={confettiColors}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 100 }}
          />
        )}

        {/* Level-specific effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {generateLevelEffects()}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center py-6">
          {/* Header with Level Badge */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <LevelBadge />
            <div className="relative">
              <PartyPopper className="w-14 h-14 text-yellow-500 animate-bounce" />
              <Sparkles className="w-5 h-5 text-pink-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>

          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
            🎉 Tặng Quà Thành Công!
          </h2>

          {/* Amount display with level glow */}
          <div className="my-6 relative">
            <div 
              className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl border"
              style={{
                background: `linear-gradient(135deg, ${levelConfig.colors.primary}20, ${levelConfig.colors.secondary}30)`,
                borderColor: levelConfig.colors.primary,
                boxShadow: `0 0 30px ${levelConfig.colors.glow}`,
              }}
            >
              <img 
                src={camlyCoinImg} 
                alt="coin" 
                className={`w-12 h-12 ${levelConfig.level === 'diamond' ? 'animate-spin' : 'animate-pulse'}`}
                style={{
                  filter: `drop-shadow(0 0 10px ${levelConfig.colors.glow})`,
                }}
              />
              <span 
                className="text-4xl font-bold"
                style={{ 
                  color: levelConfig.colors.primary,
                  textShadow: `0 0 20px ${levelConfig.colors.glow}`,
                }}
              >
                {formatNumber(amount)}
              </span>
              <span className="text-lg font-medium text-muted-foreground">{currency}</span>
            </div>
          </div>

          {/* Sender to Receiver */}
          <div className="flex items-center justify-center gap-4 my-6">
            <div className="flex flex-col items-center">
              <Avatar className="w-16 h-16 border-2 border-primary">
                <AvatarImage src={senderAvatar || ''} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {senderName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium mt-2 max-w-[100px] truncate">
                {senderName}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <Heart className="w-5 h-5 text-pink-500 fill-pink-500 animate-pulse" />
                <Heart className="w-6 h-6 text-red-500 fill-red-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <Heart className="w-5 h-5 text-pink-500 fill-pink-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              <span className="text-xs text-muted-foreground">đã tặng</span>
            </div>

            <div className="flex flex-col items-center">
              <Avatar className="w-16 h-16 border-2 border-green-500">
                <AvatarImage src={receiverAvatar || ''} />
                <AvatarFallback className="bg-green-500/20 text-green-600 font-bold">
                  {receiverName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium mt-2 max-w-[100px] truncate">
                {receiverName}
              </span>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="mx-4 p-4 rounded-xl bg-muted/50 border border-muted">
              <p className="text-sm italic text-muted-foreground">
                "{message}"
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6 px-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Đóng
            </Button>
            {onCreatePost && (
              <Button
                className="flex-1 gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                onClick={onCreatePost}
              >
                <Sparkles className="w-4 h-4" />
                Đăng bài chúc mừng
              </Button>
            )}
          </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes floatUp {
            0% {
              transform: translateY(0) scale(1);
              opacity: 0.8;
            }
            100% {
              transform: translateY(-400px) scale(1.5);
              opacity: 0;
            }
          }
          
          @keyframes silverFall {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 0.7;
            }
            100% {
              transform: translateY(600px) rotate(720deg);
              opacity: 0;
            }
          }
          
          @keyframes richRainFall {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(800px) rotate(1080deg);
              opacity: 0.3;
            }
          }
          
          @keyframes fireworkExplode {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            50% {
              transform: scale(1.5);
              opacity: 1;
            }
            100% {
              transform: scale(2);
              opacity: 0;
            }
          }
          
          @keyframes fireworkParticle {
            0% {
              transform: rotate(var(--rotation)) translateY(0);
              opacity: 1;
            }
            100% {
              transform: rotate(var(--rotation)) translateY(-80px);
              opacity: 0;
            }
          }
          
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
            20%, 40%, 60%, 80% { transform: translateX(3px); }
          }
          
          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default GiftCelebrationModal;
