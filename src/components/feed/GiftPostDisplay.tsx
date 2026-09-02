import React, { useEffect, useRef, useState } from 'react';
import { Gift, Volume2, VolumeX, Sparkles, ArrowRight, Heart, Crown, Gem, Download, ShieldCheck, ExternalLink, Copy, Check, PartyPopper, Trophy, Sprout, CakeSlice, Coins, HandHeart, Star, MessageCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import camlyCoinImg from '@/assets/camly_coin.png';
import logoFunFarm from '@/assets/logo_fun_farm_web3.png';
import gratitudeBg from '@/assets/gift-themes/gratitude.jpeg';
import loveBg from '@/assets/gift-themes/love.jpeg';
import celebrationBg from '@/assets/gift-themes/celebration.jpeg';
import gratitudeDaisyBg from '@/assets/gift-themes/gratitude-daisy.jpeg';
import gratitudeMeadowBg from '@/assets/gift-themes/gratitude-meadow.jpeg';
import gratitudeMorningBg from '@/assets/gift-themes/gratitude-morning.jpeg';
import gratitudeLightBg from '@/assets/gift-themes/gratitude-light.jpeg';
import loveRoseBg from '@/assets/gift-themes/love-rose.jpeg';
import loveRainbowBg from '@/assets/gift-themes/love-rainbow.jpeg';
import loveTulipBg from '@/assets/gift-themes/love-tulip.jpeg';
import loveHeartsBg from '@/assets/gift-themes/love-hearts.jpeg';
import celebrationBalloonsBg from '@/assets/gift-themes/celebration-balloons.jpeg';
import celebrationSparkleBg from '@/assets/gift-themes/celebration-sparkle.jpeg';
import celebrationLightBg from '@/assets/gift-themes/celebration-light.jpeg';
import celebrationRainbowBg from '@/assets/gift-themes/celebration-rainbow.jpeg';
import { getGiftLevel, parseAmountFromString, GiftLevel } from '@/lib/giftLevels';
import { toast } from 'sonner';

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

// 29 Gift templates - Clean & Positive only (matching CreateGiftPostModal)
const giftTemplates = [
  // LOVE & ROMANCE (3)
  { id: 'love', gradient: 'from-[#65172f] via-[#a52d50] to-[#531226]', emoji: '💝', effect: 'hearts' },
  { id: 'romance', gradient: 'from-rose-400 via-pink-500 to-fuchsia-500', emoji: '💕', effect: 'hearts' },
  { id: 'kiss', gradient: 'from-red-400 via-rose-500 to-pink-400', emoji: '💋', effect: 'hearts' },
  // THANKS (2)
  { id: 'thanks', gradient: 'from-[#5f3c08] via-[#a56f13] to-[#3e2907]', emoji: '🙏', effect: 'stars' },
  { id: 'appreciate', gradient: 'from-yellow-400 via-amber-500 to-orange-400', emoji: '🌟', effect: 'stars' },
  // CELEBRATION (2)
  { id: 'congrats', gradient: 'from-[#073d2c] via-[#0b7650] to-[#052d23]', emoji: '🎉', effect: 'confetti' },
  { id: 'trophy', gradient: 'from-[#15344a] via-[#24617a] to-[#10283b]', emoji: '🏆', effect: 'confetti' },
  // NATURE & FARM (4)
  { id: 'farm', gradient: 'from-[#164a2e] via-[#2f7a43] to-[#0d3824]', emoji: '🌾', effect: 'leaves' },
  { id: 'flower', gradient: 'from-pink-400 via-rose-400 to-red-300', emoji: '🌸', effect: 'petals' },
  { id: 'garden', gradient: 'from-emerald-400 via-green-500 to-teal-400', emoji: '🌻', effect: 'leaves' },
  { id: 'rainbow', gradient: 'from-red-400 via-yellow-400 to-green-400', emoji: '🌈', effect: 'rainbow' },
  // TẾT (6)
  { id: 'tet-lucky', gradient: 'from-[#741b24] via-[#b32d35] to-[#591219]', emoji: '🧧', effect: 'coins' },
  { id: 'tet-lantern', gradient: 'from-red-500 via-orange-400 to-yellow-400', emoji: '🏮', effect: 'sparkle' },
  { id: 'tet-dragon', gradient: 'from-red-600 via-orange-500 to-yellow-500', emoji: '🐉', effect: 'coins' },
  { id: 'tet-banhchung', gradient: 'from-green-600 via-green-500 to-lime-400', emoji: '🍀', effect: 'leaves' },
  { id: 'tet-peach', gradient: 'from-pink-500 via-rose-400 to-red-400', emoji: '🌺', effect: 'petals' },
  { id: 'tet-fireworks', gradient: 'from-red-500 via-yellow-500 to-orange-400', emoji: '🎇', effect: 'fireworks' },
  // BIRTHDAY (4)
  { id: 'birthday-cake', gradient: 'from-[#57255f] via-[#8b3f86] to-[#3e1948]', emoji: '🎂', effect: 'confetti' },
  { id: 'birthday-balloon', gradient: 'from-sky-400 via-blue-400 to-purple-500', emoji: '🎈', effect: 'confetti' },
  { id: 'birthday-party', gradient: 'from-purple-500 via-pink-500 to-red-400', emoji: '🥳', effect: 'confetti' },
  { id: 'birthday-gift', gradient: 'from-purple-500 via-violet-500 to-indigo-500', emoji: '🎁', effect: 'sparkle' },
  // VALENTINE (1)
  { id: 'valentine-heart', gradient: 'from-red-500 via-rose-500 to-pink-400', emoji: '❤️', effect: 'hearts' },
  // CRYPTO MEME (3)
  { id: 'crypto-rocket', gradient: 'from-orange-500 via-red-500 to-purple-600', emoji: '🚀', effect: 'fireworks' },
  { id: 'crypto-diamond-hands', gradient: 'from-cyan-400 via-blue-500 to-purple-500', emoji: '💎', effect: 'sparkle' },
  { id: 'crypto-money', gradient: 'from-[#06402e] via-[#12845a] to-[#073225]', emoji: '🤑', effect: 'coins' },
  // FUN & CUTE (4)
  { id: 'fun-cool', gradient: 'from-blue-500 via-cyan-500 to-teal-400', emoji: '😎', effect: 'sparkle' },
  { id: 'fun-star', gradient: 'from-amber-300 via-yellow-400 to-orange-400', emoji: '⭐', effect: 'stars' },
  { id: 'fun-rainbow', gradient: 'from-red-400 via-yellow-400 to-blue-400', emoji: '🦄', effect: 'rainbow' },
  { id: 'fun-angel', gradient: 'from-[#315d72] via-[#5f8f91] to-[#274658]', emoji: '😇', effect: 'sparkle' },
];

const giftBackgrounds: Record<string, string> = {
  'gratitude-leaves': gratitudeBg,
  'gratitude-daisy': gratitudeDaisyBg,
  'gratitude-meadow': gratitudeMeadowBg,
  'gratitude-morning': gratitudeMorningBg,
  'gratitude-light': gratitudeLightBg,
  'love-blossom': loveBg,
  'love-rose': loveRoseBg,
  'love-rainbow': loveRainbowBg,
  'love-tulip': loveTulipBg,
  'love-hearts': loveHeartsBg,
  'celebration-party': celebrationBg,
  'celebration-balloons': celebrationBalloonsBg,
  'celebration-sparkle': celebrationSparkleBg,
  'celebration-light': celebrationLightBg,
  'celebration-rainbow': celebrationRainbowBg,
};

const CardIcon = ({ id, className = 'h-5 w-5' }: { id: string; className?: string }) => {
  const props = { className, strokeWidth: 1.7 };
  if (id === 'love' || id === 'romance' || id === 'kiss' || id === 'valentine-heart') return <Heart {...props} />;
  if (id === 'thanks' || id === 'appreciate') return <HandHeart {...props} />;
  if (id === 'congrats' || id.includes('fireworks')) return <PartyPopper {...props} />;
  if (id === 'trophy') return <Trophy {...props} />;
  if (id === 'farm' || id === 'garden') return <Sprout {...props} />;
  if (id.includes('birthday')) return <CakeSlice {...props} />;
  if (id === 'tet-lucky' || id === 'crypto-money') return <Coins {...props} />;
  return <Star {...props} />;
};

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
  txHash?: string;
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
  giftMessage,
  txHash,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse gift info from content
  // Support formats like: "10000 CLC", "10.000 CLC", "10,000 CLC" (and crypto)
  // Improved regex to capture full number with thousands separators
  const amountMatch = content.match(/(\d{1,3}(?:[\.,]\d{3})*|\d+)\s*(CLC|CAMLY|BNB|USDT|BTCB)/i);
  const emojiMatch = content.match(/^(🙌|💗|💝|💕|💋|🙏|🌟|🎉|🏆|🌾|🌸|🌻|🌈|🧧|🏮|🐉|🍀|🌺|🎇|🎂|🎈|🥳|🎁|❤️|🚀|💎|🤑|😎|⭐|🦄|😇)/);

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

  // Parse and normalize amount - convert "10.000" or "10,000" to 10000
  const rawAmount = (amountMatch?.[1] || '0').trim();
  const currency = amountMatch ? amountMatch[2].toUpperCase() : 'CAMLY';
  const emoji = emojiMatch ? emojiMatch[1] : '🎁';

  // Get gift level based on amount - use prop first, then parse from content
  const numericAmount = giftAmount ?? parseAmountFromString(rawAmount);
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
  const selectedBackgroundId = content.match(/\[gift-bg:([\w-]+)\]/)?.[1];
  const themeVisual = emoji === '🙌' || emoji === '🙏'
    ? { label: 'Biết ơn', background: gratitudeBg, accent: '#22734c' }
    : emoji === '🎉' || emoji === '🏆'
      ? { label: 'Chúc mừng', background: celebrationBg, accent: '#8a5420' }
      : { label: 'Yêu thương', background: loveBg, accent: '#9e416d' };
  const selectedBackground = (selectedBackgroundId && giftBackgrounds[selectedBackgroundId]) || themeVisual.background;

  // Play sound when component becomes visible, pause when scrolls out
  useEffect(() => {
    if (!autoPlaySound) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Component is visible - play sound if not muted and not played yet
            if (!hasPlayed && !isMuted) {
              playSound();
              setHasPlayed(true);
              
              // Trigger screen shake for Diamond level
              if (giftLevel.effects.hasScreenShake) {
                triggerScreenShake();
              }
            } else if (hasPlayed && !isMuted && audioRef.current?.paused) {
              // Resume if was playing before
              audioRef.current?.play().catch(() => {});
            }
          } else {
            // Component scrolled out of view - pause audio (like Facebook/TikTok)
            if (audioRef.current && !audioRef.current.paused) {
              audioRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.3 } // Trigger a bit earlier
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [autoPlaySound, hasPlayed, giftLevel, isMuted]);

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

  const copyTxHash = async () => {
    if (!txHash) return;
    await navigator.clipboard.writeText(txHash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  // Download gift card as image
  const handleDownloadGift = async () => {
    if (!containerRef.current) return;
    
    toast.info('Đang chuẩn bị ảnh quà tặng...', { duration: 2000 });
    
    try {
      // Dynamic import html2canvas for smaller bundle
      const html2canvas = (await import('html2canvas')).default;
      
      // Temporarily remove shake animation and sound button for clean capture
      const container = containerRef.current;
      const soundBtn = container.querySelector('button[title*="âm thanh"]');
      const downloadBtn = container.querySelector('button:last-of-type');
      
      if (soundBtn) (soundBtn as HTMLElement).style.display = 'none';
      if (downloadBtn) (downloadBtn as HTMLElement).style.display = 'none';
      
      // Capture the gift card
      const canvas = await html2canvas(container, {
        backgroundColor: null,
        scale: 2, // High quality
        useCORS: true,
        logging: false,
        allowTaint: true,
      });
      
      // Restore buttons
      if (soundBtn) (soundBtn as HTMLElement).style.display = '';
      if (downloadBtn) (downloadBtn as HTMLElement).style.display = '';
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Không thể tạo ảnh');
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `funfarm-gift-${displayAmount}-${currency}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('🎁 Đã tải về ảnh quà tặng!');
      }, 'image/png', 1.0);
      
    } catch (error) {
      console.error('Download gift error:', error);
      toast.error('Không thể tải về. Vui lòng thử lại!');
    }
  };

  // Botanical level badge — every tier shares one calm FUN FARM language.
  const LevelBadge = () => {
    const icons: Record<GiftLevel, React.ReactNode> = {
      basic: <Heart className="w-3 h-3" />,
      silver: <Sparkles className="w-3 h-3" />,
      gold: <Crown className="w-3 h-3" />,
      diamond: <Gem className="w-3 h-3" />,
    };
    
    const badgeColors: Record<GiftLevel, string> = {
      basic: 'border-[#c9dfbd] bg-[#f4faef] text-[#357348]',
      silver: 'border-[#cbd8d4] bg-[#f2f7f5] text-[#42665f]',
      gold: 'border-[#ead59a] bg-[#fff8df] text-[#8b6720]',
      diamond: 'border-[#b9dcd8] bg-[#edf9f7] text-[#176f69]',
    };
    
    return (
      <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeColors[giftLevel.level]}`}>
        {icons[giftLevel.level]}
        <span>{giftLevel.name}</span>
      </div>
    );
  };

  // A restrained celebration: a few coins behind the content, then they rest.
  const renderLevelEffects = () => {
    const count = giftLevel.level === 'diamond' ? 10 : giftLevel.level === 'gold' ? 8 : 6;
    return Array.from({ length: count }, (_, i) => (
      <img
        key={`garden-coin-${i}`}
        src={camlyCoinImg}
        alt=""
        className="gift-garden-coin absolute h-5 w-5 opacity-0"
        style={{
          left: `${7 + ((i * 17) % 87)}%`,
          animationDelay: `${i * 0.38}s`,
          animationDuration: `${4.3 + (i % 3) * 0.45}s`,
        }}
      />
    ));
  };

  return (
    <div 
      ref={containerRef}
      className={`gift-garden-card relative mx-1 my-2 overflow-hidden rounded-[22px] border border-[#dfcc91] text-[#174c38] shadow-[0_14px_36px_rgba(42,88,57,0.14)] transition-transform sm:mx-2 ${isShaking ? 'animate-shake' : ''}`}
    >
      <div className="relative overflow-hidden bg-cover bg-center px-4 py-3 sm:px-5 sm:py-4" style={{ backgroundImage: `url(${selectedBackground})` }}>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.38),rgba(255,255,255,.08)_52%,rgba(247,240,205,.16))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,#f8e5a5_28%,#fff9d9_50%,#d9bc63_72%,transparent)]" />
        <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-white/80 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-52 w-52 rounded-full bg-[#cce9bd]/55 blur-3xl" />

        <button
          onClick={toggleMute}
          className="absolute right-4 top-3.5 z-20 rounded-full border border-[#d9c990] bg-white/70 p-1.5 text-[#56725f] shadow-sm transition hover:bg-white"
          title={isMuted ? 'Bật âm thanh 🔊' : 'Tắt âm thanh 🔇'}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-[22px]">
          {renderLevelEffects()}
        </div>

        <div className="relative z-10 mb-2.5 flex items-center justify-between pr-10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#176b48]">
              <img src={logoFunFarm} alt="FUN FARM" className="h-7 w-7 rounded-full object-cover shadow-sm" />
              <span>Fun Farm Gift</span>
            </div>
            <span className="h-3 w-px bg-[#dccb95]" />
            <span className="rounded-full border border-white/80 bg-white/65 px-2 py-0.5 text-[10px] font-semibold backdrop-blur" style={{ color: themeVisual.accent }}>{emoji} {themeVisual.label}</span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f8efcf] text-[#9d7927]">
            <CardIcon id={template.id} className="h-4 w-4" />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-center gap-4 py-1 sm:gap-9">
          <div className="flex min-w-0 flex-col items-center">
            <div className="relative">
              <Avatar className="h-11 w-11 border-2 border-white shadow-[0_3px_12px_rgba(27,91,59,0.18)] sm:h-12 sm:w-12">
                <AvatarImage src={senderAvatar || ''} />
                <AvatarFallback className="bg-[#e6f2df] text-[#34704c]">{senderName?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-[#2aa66b] p-1 text-white">
                <Gift className="h-2.5 w-2.5" />
              </div>
            </div>
            <span className="mt-1 max-w-[112px] truncate text-xs font-semibold text-[#234d3a]">{senderName || 'Người tặng'}</span>
            {senderWallet && (
              <span className="mt-0.5 font-mono text-[9px] text-[#6c8175]">{shortenWallet(senderWallet)}</span>
            )}
          </div>

          <div className="flex flex-col items-center gap-0.5 text-[#b98c2b]">
            <div className="flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" /><Heart className="h-3.5 w-3.5 fill-[#f4d889]" /><Sparkles className="h-2.5 w-2.5" /></div>
            <ArrowRight className="h-5 w-5" />
            <span className="text-[10px] font-medium text-[#6e806f]">trao tặng</span>
          </div>

          <div className="flex min-w-0 flex-col items-center">
            <div className="relative">
              <Avatar className="h-11 w-11 border-2 border-white shadow-[0_3px_12px_rgba(27,91,59,0.18)] sm:h-12 sm:w-12">
                <AvatarImage src={receiverAvatar || ''} />
                <AvatarFallback className="bg-[#e6f2df] text-[#34704c]">{receiverName?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-[#d5a62e] p-1 text-white">
                <Sparkles className="h-2.5 w-2.5" />
              </div>
            </div>
            <span className="mt-1 max-w-[112px] truncate text-xs font-semibold text-[#234d3a]">{receiverName || 'Người nhận'}</span>
            {receiverWallet && (
              <span className="mt-0.5 font-mono text-[9px] text-[#6c8175]">{shortenWallet(receiverWallet)}</span>
            )}
          </div>
        </div>

        <div className="relative z-10 my-2 flex items-center justify-center gap-2 border-y border-[#dce9d5] py-2.5">
          <img src={camlyCoinImg} alt="Camly Coin" className="h-9 w-9 drop-shadow-[0_3px_5px_rgba(122,83,16,0.28)] sm:h-10 sm:w-10" />
          <div className="flex items-baseline gap-2">
            <span className="bg-[linear-gradient(180deg,#8e6818_0%,#d4aa42_48%,#765211_100%)] bg-clip-text text-3xl font-extrabold leading-none text-transparent sm:text-[34px]">{displayAmount}</span>
            <span className="text-[11px] font-bold tracking-[0.12em] text-[#2f6b4a]">{currency === 'CAMLY' || currency === 'CLC' ? 'CAMLY COIN' : currency}</span>
          </div>
        </div>

        {truncatedMessage && (
          <div className="relative z-10 flex items-start justify-center gap-2 rounded-xl border border-white/75 bg-white/72 px-3 py-2 text-center shadow-sm backdrop-blur-md">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b78b2c]" />
            <p className="text-sm italic leading-relaxed text-[#4e6657]">“{truncatedMessage}”</p>
          </div>
        )}

        {txHash && (
          <div className="relative z-10 mt-2 flex items-center gap-2 rounded-xl border border-[#c9dfc1] bg-white/70 px-3 py-2 text-[#285b42] shadow-[0_3px_10px_rgba(51,97,65,0.06)]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#219565]" />
            <span className="hidden text-[11px] font-semibold sm:inline">Đã xác minh trên BSC</span>
            <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[#667b6e]" title={txHash}>{shortenWallet(txHash)}</span>
            <span className="rounded-full bg-[#e2f6e9] px-2 py-0.5 text-[9px] font-bold text-[#238358]">ON-CHAIN</span>
            <div className="flex shrink-0 items-center gap-0.5">
              <button type="button" onClick={copyTxHash} className="rounded-md p-1 hover:bg-[#e7f4df]" title="Sao chép mã giao dịch">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
              <a href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="rounded-md p-1 hover:bg-[#e7f4df]" title="Xem giao dịch trên BscScan"><ExternalLink className="h-4 w-4" /></a>
            </div>
          </div>
        )}

        <div className="relative z-10 mt-2 flex items-center justify-center gap-3">
          <span className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-[#7f6a32]"><Sprout className="h-3.5 w-3.5 text-[#4a985f]" /> Gieo yêu thương · Gặt thịnh vượng</span>
          <Button
            onClick={handleDownloadGift}
            variant="outline"
            size="sm"
            className="h-7 gap-1 border-[#d9c78c] bg-white/60 px-2.5 text-[11px] text-[#5f684e] hover:bg-white"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tải về</span>
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes gardenCoinFall {
          0% { transform: translate3d(0,-36px,0) rotate(0); opacity: 0; }
          12% { opacity: .42; }
          75% { opacity: .28; }
          100% { transform: translate3d(12px,390px,0) rotate(420deg); opacity: 0; }
        }
        .gift-garden-coin { animation: gardenCoinFall 5s ease-in forwards; filter: drop-shadow(0 2px 3px rgba(117,83,20,.18)); }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        @media (prefers-reduced-motion: reduce) {
          .gift-garden-coin, .animate-shake { animation: none !important; }
        }
      `}</style>
    </div>
  );
};

export default GiftPostDisplay;
