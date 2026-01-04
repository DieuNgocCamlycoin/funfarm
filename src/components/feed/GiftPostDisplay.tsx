import React from 'react';
import { Gift, Heart, Sparkles, Star, PartyPopper, Coins, Leaf } from 'lucide-react';
import camlyCoinImg from '@/assets/camly_coin.png';

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
}

const GiftPostDisplay: React.FC<GiftPostDisplayProps> = ({ content }) => {
  // Parse gift info from content
  const amountMatch = content.match(/(\d{1,3}(?:[\.,]\d{3})*)\s*(CLC|CAMLY|BNB|USDT|BTCB)/i);
  const receiverMatch = content.match(/@(\S+)/);
  const emojiMatch = content.match(/^(💝|💕|💋|🙏|🌟|🎉|🎊|🎆|💪|📣|🌾|🌸|🌻|🌈|💰|🧧|💎|🎂|🎁|⭐)/);
  
  const amount = amountMatch ? amountMatch[1] : '0';
  const currency = amountMatch ? amountMatch[2].toUpperCase() : 'CLC';
  const receiver = receiverMatch ? receiverMatch[1] : 'bạn';
  const emoji = emojiMatch ? emojiMatch[1] : '🎁';
  
  // Find matching template
  const template = giftTemplates.find(t => t.emoji === emoji) || giftTemplates[0];

  // Render effect particles
  const renderEffectParticles = () => {
    const particles = [];
    
    // Sparkle particles - always show
    for (let i = 0; i < 20; i++) {
      const size = 2 + Math.random() * 4;
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const delay = Math.random() * 2;
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
            opacity: 0.3 + Math.random() * 0.5,
            animation: `pulse ${duration}s infinite`,
            animationDelay: `${delay}s`,
          }}
        />
      );
    }

    // Effect-specific particles
    if (template.effect === 'hearts') {
      for (let i = 0; i < 8; i++) {
        particles.push(
          <div
            key={`heart-${i}`}
            className="absolute text-2xl opacity-40"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `bounce ${1.5 + Math.random()}s infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          >
            ❤️
          </div>
        );
      }
    }

    if (template.effect === 'stars') {
      for (let i = 0; i < 10; i++) {
        particles.push(
          <div
            key={`star-${i}`}
            className="absolute text-xl opacity-50"
            style={{
              left: `${5 + i * 10}%`,
              top: `${15 + (i % 4) * 20}%`,
              animation: `spin ${3 + Math.random() * 2}s linear infinite, pulse 1.5s infinite`,
              animationDelay: `${i * 0.15}s`,
            }}
          >
            ⭐
          </div>
        );
      }
    }

    if (template.effect === 'confetti') {
      const confettiColors = ['🎊', '🎉', '🎈', '✨', '🌟'];
      for (let i = 0; i < 12; i++) {
        particles.push(
          <div
            key={`confetti-${i}`}
            className="absolute text-lg opacity-60"
            style={{
              left: `${5 + i * 8}%`,
              top: `${10 + (i % 5) * 18}%`,
              animation: `bounce ${1 + Math.random()}s infinite`,
              animationDelay: `${i * 0.1}s`,
            }}
          >
            {confettiColors[i % confettiColors.length]}
          </div>
        );
      }
    }

    if (template.effect === 'coins') {
      for (let i = 0; i < 8; i++) {
        particles.push(
          <div
            key={`coin-${i}`}
            className="absolute text-xl opacity-50"
            style={{
              left: `${8 + i * 12}%`,
              top: `${15 + (i % 3) * 25}%`,
              animation: `spin ${2 + Math.random()}s linear infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          >
            🪙
          </div>
        );
      }
    }

    if (template.effect === 'leaves') {
      const leaves = ['🍃', '🌿', '☘️', '🌱'];
      for (let i = 0; i < 8; i++) {
        particles.push(
          <div
            key={`leaf-${i}`}
            className="absolute text-xl opacity-40"
            style={{
              left: `${10 + i * 11}%`,
              top: `${15 + (i % 4) * 20}%`,
              animation: `bounce ${2 + Math.random()}s infinite`,
              animationDelay: `${i * 0.25}s`,
            }}
          >
            {leaves[i % leaves.length]}
          </div>
        );
      }
    }

    if (template.effect === 'petals') {
      const petals = ['🌸', '🌺', '💮', '🏵️'];
      for (let i = 0; i < 10; i++) {
        particles.push(
          <div
            key={`petal-${i}`}
            className="absolute text-lg opacity-50"
            style={{
              left: `${5 + i * 10}%`,
              top: `${10 + (i % 5) * 18}%`,
              animation: `spin ${4 + Math.random() * 2}s linear infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          >
            {petals[i % petals.length]}
          </div>
        );
      }
    }

    if (template.effect === 'rainbow') {
      for (let i = 0; i < 6; i++) {
        particles.push(
          <div
            key={`rainbow-${i}`}
            className="absolute text-xl opacity-40"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `pulse ${1.5 + Math.random()}s infinite`,
              animationDelay: `${i * 0.15}s`,
            }}
          >
            🌈
          </div>
        );
      }
    }

    return particles;
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${template.gradient} p-4 sm:p-6 text-white shadow-xl mx-3 sm:mx-4 my-3`}>
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {renderEffectParticles()}
        
        {/* Glowing overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        
        {/* Moving gradient overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.4) 0%, transparent 50%)',
            animation: 'pulse 3s infinite',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm">
            <Gift className="w-5 h-5" />
            <span className="font-bold text-sm">Fun Farm Gift</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-4xl animate-bounce">{template.emoji}</span>
          </div>
        </div>

        {/* Gift info with glowing effect */}
        <div className="text-center bg-white/25 rounded-2xl py-4 px-6 backdrop-blur-sm border border-white/40 shadow-lg mb-4">
          <div className="flex items-center justify-center gap-3">
            {currency === 'CLC' || currency === 'CAMLY' ? (
              <img 
                src={camlyCoinImg} 
                alt="coin" 
                className="w-10 h-10 sm:w-12 sm:h-12"
                style={{ animation: 'spin 3s linear infinite' }} 
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-400/80 flex items-center justify-center text-xl font-bold text-yellow-900">
                {currency === 'BNB' ? '₿' : '$'}
              </div>
            )}
            <div>
              <span className="text-3xl sm:text-4xl font-bold drop-shadow-lg">{amount}</span>
              <span className="text-lg sm:text-xl ml-2 font-semibold">{currency}</span>
            </div>
          </div>
          <div className="mt-2 text-sm opacity-90 flex items-center justify-center gap-1">
            <Heart className="w-4 h-4 fill-white animate-pulse" />
            <span>Tặng cho @{receiver}</span>
          </div>
        </div>

        {/* Fun decorative elements */}
        <div className="flex items-center justify-center gap-2 opacity-80">
          <div className="flex">
            {['❤️', '💖', '💝'].map((heart, i) => (
              <span 
                key={i} 
                className="text-lg animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {heart}
              </span>
            ))}
          </div>
          <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">
            with love from Fun Farm 🌱
          </span>
          <div className="flex">
            {['💝', '💖', '❤️'].map((heart, i) => (
              <span 
                key={i} 
                className="text-lg animate-bounce"
                style={{ animationDelay: `${i * 0.2 + 0.3}s` }}
              >
                {heart}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftPostDisplay;
