import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, Sparkles, Copy, ExternalLink, ShieldCheck, Check } from 'lucide-react';
import camlyCoinImg from '@/assets/camly_coin.png';
import funMoneyImg from '@/assets/ecosystem/fun-money.png';
import angelClappingGif from '@/assets/angel-gifs/angel-clapping.gif';
import { getGiftLevel } from '@/lib/giftLevels';

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
  txHash?: string;
  onCreatePost?: () => void;
}

// Small glowing coins stay in the outer stage, leaving the receipt perfectly readable.
const DancingCoin = ({ delay, x, y, size, kind }: { delay: number; x: number; y: number; size: number; kind: 'camly' | 'fun' }) => (
  <div
    className="absolute pointer-events-none"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      animation: `celebrationCoinBreath ${4.6 + (size % 4) * .35}s ease-in-out ${delay}s infinite`,
    }}
  >
    <span className="absolute inset-0 rounded-full bg-amber-300/60 blur-md" />
    <img src={kind === 'fun' ? funMoneyImg : camlyCoinImg} alt="" className="relative rounded-full" style={{ width: size, height: size }} />
  </div>
);

const RichWord = ({ delay, x, y, color }: { delay: number; x: number; y: number; color: string }) => (
  <span className="absolute select-none text-xl font-black tracking-[.2em] sm:text-3xl" style={{ left: `${x}%`, top: `${y}%`, color, textShadow: `0 0 16px ${color}`, animation: `richWordDance 5.8s ease-in-out ${delay}s infinite` }}>RICH</span>
);

const PartyCannon = ({ side }: { side: 'left' | 'right' }) => (
  <div className={`absolute bottom-[5%] ${side === 'left' ? 'left-[3%]' : 'right-[3%] scale-x-[-1]'}`}>
    <div className="text-5xl drop-shadow-[0_0_14px_rgba(255,202,58,.8)]">🎉</div>
    {Array.from({ length: 18 }, (_, i) => {
      const angle = -74 + (i % 9) * 8;
      const distance = 95 + (i % 5) * 22;
      return <i key={i} className="absolute left-7 top-4 h-2 w-1.5 rounded-sm" style={{ background: ['#ffd43b','#ff5d9e','#53d8fb','#8ce36b','#b989ff','#ff8c42'][i % 6], ['--party-x' as string]: `${Math.cos(angle * Math.PI / 180) * distance}px`, ['--party-y' as string]: `${Math.sin(angle * Math.PI / 180) * distance}px`, animation: `partyCannonShot 1.45s cubic-bezier(.2,.75,.35,1) ${i % 3 * 1.55}s 3 both` }} />;
    })}
  </div>
);

// Firework burst
const FireworkBurst = ({ x, y, color, delay }: { x: number; y: number; color: string; delay: number }) => (
  <div
    className="absolute pointer-events-none"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      animation: `fireworkExplode 3.8s ease-out ${delay}s infinite`,
    }}
  >
    {[...Array(12)].map((_, i) => (
      <div
        key={i}
        className="absolute h-2 w-2 rounded-full"
        style={{
          backgroundColor: color,
          ['--firework-x' as string]: `${Math.cos((i * Math.PI) / 6) * 78}px`,
          ['--firework-y' as string]: `${Math.sin((i * Math.PI) / 6) * 78}px`,
          animation: `fireworkParticle 3.8s ease-out ${delay}s infinite`,
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
  txHash,
  onCreatePost,
}) => {
  const [isShaking, setIsShaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const giftLevel = getGiftLevel(amount);
  const levelConfig = giftLevel;

  useEffect(() => {
    if (isOpen) {
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

      return () => {
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

  const copyTxHash = async () => {
    if (!txHash) return;
    await navigator.clipboard.writeText(txHash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  // A balanced outer-stage composition: no random clumps and no center obstruction.
  const generateLevelEffects = () => {
    const coinPositions = [
      [4,12],[12,22],[22,34],[7,47],[18,58],[5,72],[16,82],[28,92],[34,16],[31,76],
      [96,12],[88,22],[78,34],[93,47],[82,58],[95,72],[84,82],[72,92],[66,16],[69,76],
    ] as const;
    const fireworks = [
      [9,18],[22,48],[11,76],[32,86],[91,18],[78,48],[89,76],[68,86],
    ] as const;
    const colors = ['#ffd43b','#ff5d9e','#53d8fb','#8ce36b','#b989ff','#ff8c42','#00c9a7','#ffd43b'];
    const words = [[3,25],[11,43],[5,64],[18,82],[29,91],[31,12],[82,24],[74,43],[84,64],[69,82],[58,91],[64,12]] as const;
    return <>
      {coinPositions.map(([x,y], i) => <DancingCoin key={`coin-${i}`} x={x} y={y} delay={-i * .43} size={20 + (i % 3) * 4} kind={i % 2 ? 'fun' : 'camly'} />)}
      {fireworks.map(([x,y], i) => <FireworkBurst key={`firework-${i}`} x={x} y={y} color={colors[i]} delay={i * .46} />)}
      {words.map(([x,y], i) => <RichWord key={`rich-${i}`} x={x} y={y} delay={-i * .72} color={colors[i % colors.length]} />)}
      <PartyCannon side="left" /><PartyCannon side="right" />
    </>;
  };

  return (<>
    {isOpen && typeof document !== 'undefined' && createPortal(
      <div className="pointer-events-none fixed inset-0 z-[51] overflow-hidden" aria-hidden="true">{generateLevelEffects()}</div>,
      document.body,
    )}
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`z-[52] max-h-[90dvh] overflow-visible border border-amber-300/70 bg-gradient-to-br from-[#fffdf6] via-background to-[#eefbf2] p-0 shadow-[0_30px_100px_rgba(90,65,10,0.28)] sm:max-w-lg transition-transform ${isShaking ? 'animate-shake' : ''}`}
      >
        {/* Content */}
        <div className="relative z-10 px-5 py-5 text-center sm:px-6">
          <img
            src={angelClappingGif}
            alt="Angel vỗ tay chúc mừng"
            className="pointer-events-none absolute right-1 top-1 h-16 w-16 object-contain drop-shadow-[0_10px_18px_rgba(212,175,55,0.35)] sm:h-20 sm:w-20"
          />
          <h2 className="mb-1 text-2xl font-extrabold text-[#176b48]">
            Tặng quà thành công
          </h2>
          <div className="mx-auto w-fit rounded-full border border-amber-300/70 bg-white/75 px-4 py-1 text-[11px] font-black tracking-[0.18em] text-emerald-700 shadow-sm">
            RICH · RICH · RICH
          </div>

          {/* Amount display with level glow */}
          <div className="relative my-3">
            <div 
              className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3"
              style={{
                background: `linear-gradient(135deg, ${levelConfig.colors.primary}20, ${levelConfig.colors.secondary}30)`,
                borderColor: levelConfig.colors.primary,
                boxShadow: `0 0 30px ${levelConfig.colors.glow}`,
              }}
            >
              <img 
                src={camlyCoinImg} 
                alt="coin" 
                className="h-10 w-10 animate-pulse"
                style={{
                  filter: `drop-shadow(0 0 10px ${levelConfig.colors.glow})`,
                }}
              />
              <span 
                className="text-3xl font-bold"
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
          <div className="my-3 flex items-center justify-center gap-4">
            <div className="flex flex-col items-center">
              <Avatar className="h-12 w-12 border-2 border-primary">
                <AvatarImage src={senderAvatar || ''} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {senderName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="mt-1 max-w-[100px] truncate text-xs font-medium">
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
              <Avatar className="h-12 w-12 border-2 border-green-500">
                <AvatarImage src={receiverAvatar || ''} />
                <AvatarFallback className="bg-green-500/20 text-green-600 font-bold">
                  {receiverName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="mt-1 max-w-[100px] truncate text-xs font-medium">
                {receiverName}
              </span>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="rounded-xl border border-muted bg-white/60 p-3">
              <p className="text-sm italic text-muted-foreground">
                "{message}"
              </p>
            </div>
          )}

          {txHash && (
            <div className="mt-3 rounded-2xl border border-emerald-300/60 bg-white/80 p-3 text-left shadow-sm backdrop-blur-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-semibold text-emerald-800">
                  <ShieldCheck className="h-5 w-5" /> Biên nhận blockchain
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Đã xác minh on-chain</span>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
                <span className="text-muted-foreground">Mạng</span><span className="text-right font-medium">BNB Smart Chain · Chain ID 56</span>
                <span className="text-muted-foreground">Mã giao dịch</span><span className="truncate text-right font-mono" title={txHash}>{txHash}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={copyTxHash} className="gap-2">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}{copied ? 'Đã sao chép' : 'Sao chép mã'}
                </Button>
                <Button asChild type="button" variant="outline" size="sm" className="gap-2 border-emerald-300 text-emerald-800">
                  <a href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">Xem trên BscScan <ExternalLink className="h-4 w-4" /></a>
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Đóng
            </Button>
            {onCreatePost && (
              <Button
                className="ff-action-metal flex-1 gap-2"
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
          @keyframes celebrationCoinBreath {
            0%, 100% { transform: translate3d(-5px,8px,0) rotate(-8deg) scale(.68); opacity: .32; filter: brightness(.95); }
            38% { transform: translate3d(8px,-18px,0) rotate(9deg) scale(1.05); opacity: .92; filter: brightness(1.35); }
            68% { transform: translate3d(-2px,-7px,0) rotate(-3deg) scale(.82); opacity: .55; filter: brightness(1.1); }
          }
          @keyframes richWordDance {
            0%, 100% { transform: translate3d(0,0,0) rotate(-4deg) scale(.78); opacity: .18; }
            34% { transform: translate3d(9px,-16px,0) rotate(3deg) scale(1.06); opacity: .82; }
            72% { transform: translate3d(-5px,24px,0) rotate(-2deg) scale(.88); opacity: .35; }
          }
          @keyframes partyCannonShot {
            0% { transform: translate(0,0) rotate(0) scale(.3); opacity: 0; }
            12% { opacity: 1; }
            72% { opacity: .9; }
            100% { transform: translate(var(--party-x),var(--party-y)) rotate(520deg) scale(.8); opacity: 0; }
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
            0%, 68% { transform: translate(0, 0) scale(.25); opacity: 0; }
            72% { opacity: 1; }
            92%, 100% { transform: translate(var(--firework-x), var(--firework-y)) scale(.15); opacity: 0; }
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
  </>);
};

export default GiftCelebrationModal;
