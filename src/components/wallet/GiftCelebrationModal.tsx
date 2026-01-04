import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, Sparkles, PartyPopper } from 'lucide-react';
import camlyCoinImg from '@/assets/camly_coin.png';

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

// Flying coin component
const FlyingCoin = ({ delay, startX }: { delay: number; startX: number }) => (
  <div
    className="absolute pointer-events-none"
    style={{
      left: `${startX}%`,
      bottom: '-20px',
      animation: `flyUp 2s ease-out ${delay}s forwards`,
    }}
  >
    <img src={camlyCoinImg} alt="coin" className="w-8 h-8 animate-spin" />
  </div>
);

// Sparkle particle
const SparkleParticle = ({ delay, x, y, color }: { delay: number; x: number; y: number; color: string }) => (
  <div
    className="absolute w-2 h-2 rounded-full pointer-events-none"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      backgroundColor: color,
      animation: `sparkle 1.5s ease-out ${delay}s infinite`,
    }}
  />
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

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      // Play celebration sound
      const audio = new Audio('/celebration.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});

      // Stop confetti after 5 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('vi-VN');
  };

  // Generate random coins
  const flyingCoins = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    delay: Math.random() * 2,
    startX: Math.random() * 100,
  }));

  // Generate sparkles
  const sparkles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: Math.random() * 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: ['#FFD700', '#FF69B4', '#00CED1', '#FF6347', '#98FB98'][Math.floor(Math.random() * 5)],
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md overflow-hidden border-0 bg-gradient-to-b from-primary/20 via-background to-background">
        {/* Confetti */}
        {showConfetti && (
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.2}
            colors={['#FFD700', '#FF69B4', '#00CED1', '#FF6347', '#98FB98', '#DDA0DD']}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 100 }}
          />
        )}

        {/* Flying coins */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {flyingCoins.map((coin) => (
            <FlyingCoin key={coin.id} delay={coin.delay} startX={coin.startX} />
          ))}
        </div>

        {/* Sparkles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {sparkles.map((sparkle) => (
            <SparkleParticle
              key={sparkle.id}
              delay={sparkle.delay}
              x={sparkle.x}
              y={sparkle.y}
              color={sparkle.color}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center py-6">
          {/* Header */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <PartyPopper className="w-16 h-16 text-yellow-500 animate-bounce" />
              <Sparkles className="w-6 h-6 text-pink-500 absolute -top-2 -right-2 animate-pulse" />
            </div>
          </div>

          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
            🎉 Tặng Quà Thành Công!
          </h2>

          {/* Amount display */}
          <div className="my-6 relative">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-primary/20 to-green-500/20 border border-primary/30">
              <img src={camlyCoinImg} alt="coin" className="w-10 h-10 animate-pulse" />
              <span className="text-4xl font-bold text-primary">
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
          @keyframes flyUp {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(-500px) rotate(720deg);
              opacity: 0;
            }
          }
          
          @keyframes sparkle {
            0%, 100% {
              transform: scale(0);
              opacity: 0;
            }
            50% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default GiftCelebrationModal;
