// 🌱 Divine Mantra: "Phước lành từ Cha Vũ Trụ"
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Heart, Gift, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import camlyCoinLogo from '@/assets/camly_coin.png';

interface WelcomeBonusModalProps {
  isOpen: boolean;
  onClose: (connectWallet?: boolean) => void;
  type: 'registration' | 'wallet';
  amount: number;
  totalAmount?: number;
  showConnectWallet?: boolean;
  walletBonus?: number;
}

const WelcomeBonusModal = ({ 
  isOpen, 
  onClose, 
  type, 
  amount, 
  totalAmount,
  showConnectWallet = false,
  walletBonus = 0
}: WelcomeBonusModalProps) => {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const isRegistration = type === 'registration';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent className="sm:max-w-md border-primary/30 bg-gradient-to-b from-background to-primary/5 overflow-hidden">
        {isOpen && (
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={150}
            gravity={0.2}
            colors={['#FFD700', '#FFA500', '#FF6B6B', '#4CAF50', '#2196F3']}
          />
        )}
        
        <div className="relative z-10 text-center py-6">
          {/* Animated Icon */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 animate-ping rounded-full bg-accent/30" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center p-4">
              <img 
                src={camlyCoinLogo} 
                alt="CAMLY" 
                className="w-full h-full object-contain animate-bounce" 
              />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-display font-bold text-gradient-hero mb-4 flex items-center justify-center gap-2">
            {isRegistration ? (
              <>
                <Gift className="w-6 h-6 text-accent" />
                Chào mừng bạn đến FUN FARM!
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6 text-accent" />
                Ví đã kết nối thành công!
              </>
            )}
          </h2>

          {/* Message */}
          <div className="space-y-3 mb-6">
            {isRegistration ? (
              <>
                <p className="text-lg text-foreground">
                  Phước lành chào mừng đã về pending ❤️
                </p>
                <div className="flex items-center justify-center gap-2 text-3xl font-display font-bold text-accent">
                  <img src={camlyCoinLogo} alt="CAMLY" className="w-10 h-10" />
                  {amount.toLocaleString()} CAMLY
                </div>
                
                {/* Wallet bonus incentive */}
                {showConnectWallet && walletBonus > 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30">
                    <p className="text-sm text-muted-foreground mb-2">Kết nối ví ngay để nhận thêm</p>
                    <div className="flex items-center justify-center gap-2 text-xl font-display font-bold text-primary">
                      <Wallet className="w-5 h-5" />
                      +{walletBonus.toLocaleString()} CAMLY
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Tổng phước lành: <span className="text-accent font-bold">{(amount + walletBonus).toLocaleString()} CAMLY</span>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-lg text-foreground">
                  Tuyệt vời! Ví đã kết nối!
                </p>
                <p className="text-muted-foreground">
                  Cha Vũ Trụ tặng thêm
                </p>
                <div className="flex items-center justify-center gap-2 text-3xl font-display font-bold text-accent">
                  <img src={camlyCoinLogo} alt="CAMLY" className="w-10 h-10" />
                  {amount.toLocaleString()} CAMLY
                </div>
                {totalAmount && (
                  <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-sm text-muted-foreground mb-1">Tổng cộng bạn đang có</p>
                    <p className="text-xl font-display font-bold text-primary">
                      {totalAmount.toLocaleString()} CAMLY
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      chờ nhận về ví thật ❤️
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Love message */}
          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-6">
            <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
            <span>Phước lành từ Cha Vũ Trụ</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
          </div>

          {/* Buttons */}
          {isRegistration && showConnectWallet ? (
            <div className="space-y-3">
              <Button 
                onClick={() => onClose(true)}
                className="w-full h-12 gradient-hero border-0 gap-2 text-lg"
              >
                <Wallet className="w-5 h-5" />
                Kết nối ví ngay
              </Button>
              <button
                onClick={() => onClose(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Để sau, khám phá trước →
              </button>
            </div>
          ) : (
            <Button 
              onClick={() => onClose(false)}
              className="w-full h-12 gradient-hero border-0 gap-2 text-lg"
            >
              <Sparkles className="w-5 h-5" />
              {isRegistration ? 'Bắt đầu khám phá' : 'Tiếp tục'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeBonusModal;
