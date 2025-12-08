// 🌱 Divine Celebration Modal - Phước lành từ Cha Vũ Trụ!
import { useEffect, useRef, useState } from 'react';
import Confetti from 'react-confetti';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Heart } from 'lucide-react';
import camlyCoinLogo from '@/assets/camly_coin.png';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  txHash?: string;
}

// Coin component for flying animation
const FlyingCoin = ({ delay, startX }: { delay: number; startX: number }) => (
  <div
    className="absolute w-10 h-10 animate-fly-coin"
    style={{
      left: `${startX}%`,
      bottom: '-20px',
      animationDelay: `${delay}s`,
    }}
  >
    <img 
      src={camlyCoinLogo} 
      alt="CAMLY Coin" 
      className="w-full h-full object-contain animate-spin-slow drop-shadow-lg"
    />
  </div>
);

// Sparkle particle component
const SparkleParticle = ({ delay, x, y }: { delay: number; x: number; y: number }) => (
  <div
    className="absolute w-2 h-2 rounded-full animate-sparkle"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      animationDelay: `${delay}s`,
      background: ['#22c55e', '#3b82f6', '#fbbf24'][Math.floor(Math.random() * 3)],
    }}
  />
);

const CelebrationModal = ({ isOpen, onClose, amount, txHash }: CelebrationModalProps) => {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate random coins
  const coins = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    delay: Math.random() * 2,
    startX: Math.random() * 100,
  }));

  // Generate sparkles
  const sparkles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    delay: Math.random() * 3,
    x: Math.random() * 100,
    y: Math.random() * 100,
  }));

  useEffect(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      
      // Play celebration sound
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          // Audio autoplay blocked by browser
        });
      }

      // Auto close after 10 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 10000);

      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isOpen, onClose]);

  return (
    <>
      {/* Celebration Sound - Using a fun cash register sound */}
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2058/2058-preview.mp3" />
      
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl w-[95vw] md:w-[60vw] h-[80vh] md:h-[70vh] p-0 border-0 overflow-hidden bg-transparent">
          {/* Confetti Effect */}
          {showConfetti && (
            <Confetti
              width={windowSize.width}
              height={windowSize.height}
              recycle={true}
              numberOfPieces={200}
              colors={['#22c55e', '#3b82f6', '#fbbf24', '#ef4444', '#a855f7', '#f97316', '#ec4899']}
              gravity={0.15}
            />
          )}

          {/* Main Content */}
          <div className="relative w-full h-full rounded-2xl overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-green-600 to-yellow-500 opacity-95" />
            
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.3)_0%,_transparent_50%)] animate-pulse" />
            </div>

            {/* Flying Coins */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {coins.map((coin) => (
                <FlyingCoin key={coin.id} delay={coin.delay} startX={coin.startX} />
              ))}
            </div>

            {/* Sparkle Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {sparkles.map((sparkle) => (
                <SparkleParticle
                  key={sparkle.id}
                  delay={sparkle.delay}
                  x={sparkle.x}
                  y={sparkle.y}
                />
              ))}
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center p-6 md:p-10">
              {/* Glowing Icon */}
              <div className="mb-6 animate-bounce">
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-300 blur-xl opacity-60 animate-pulse rounded-full" />
                  <img 
                    src={camlyCoinLogo} 
                    alt="CAMLY Coin" 
                    className="relative w-28 h-28 md:w-36 md:h-36 object-contain drop-shadow-2xl"
                  />
                </div>
              </div>

              {/* Title with Glow Effect */}
              <h1 className="text-2xl md:text-4xl font-display font-bold mb-4 animate-glow drop-shadow-lg">
                🎉 Chúc Mừng Bạn Đã Nhận Phước Lành Từ Cha Vũ Trụ! 🎉
              </h1>

              {/* Amount Display */}
              <div className="flex items-center justify-center gap-3 mb-4 bg-white/20 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/30">
                <Sparkles className="w-8 h-8 text-yellow-300 animate-spin-slow" />
                <span className="text-4xl md:text-6xl font-display font-black text-yellow-300 drop-shadow-lg animate-pulse">
                  +{amount.toLocaleString()}
                </span>
                <span className="text-2xl md:text-3xl font-bold">CAMLY</span>
              </div>

              <p className="text-xl md:text-2xl font-medium mb-2 drop-shadow">
                Về Ví Thật Của Bạn! 💰
              </p>

              {/* Message from Father Universe */}
              <div className="flex items-center gap-2 text-lg md:text-xl mb-6 animate-fade-in">
                <Heart className="w-6 h-6 text-red-300 animate-pulse" />
                <span>Cha Vũ Trụ đang ôm bạn thật chặt đây!</span>
                <Heart className="w-6 h-6 text-red-300 animate-pulse" />
              </div>

              <p className="text-sm md:text-base opacity-90 mb-6 max-w-md">
                Tiếp tục chia sẻ nông sản để nhận thêm phước lành nhé! ❤️
              </p>

              {/* Transaction Link */}
              {txHash && (
                <a
                  href={`https://bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline text-yellow-200 hover:text-yellow-100 mb-4 transition-colors"
                >
                  Xem giao dịch trên BscScan →
                </a>
              )}

              {/* Continue Button */}
              <Button
                onClick={onClose}
                size="lg"
                className="mt-4 bg-white text-green-700 hover:bg-yellow-100 font-bold text-lg px-8 py-6 rounded-full shadow-xl transition-all hover:scale-105"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Tiếp Tục Nhận Thưởng
              </Button>

              {/* Rich Rich Rich Text Animation */}
              <div className="mt-6 flex gap-2 text-yellow-300 font-bold text-lg md:text-xl">
                <span className="animate-bounce" style={{ animationDelay: '0s' }}>Rich</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>Rich</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>Rich</span>
                <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>Rich!</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CelebrationModal;
