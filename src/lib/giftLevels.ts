// Gift Level System - Different celebration effects based on CAMLY amount

export type GiftLevel = 'basic' | 'silver' | 'gold' | 'diamond';

export interface GiftLevelConfig {
  level: GiftLevel;
  name: string;
  emoji: string;
  minAmount: number;
  maxAmount: number;
  colors: {
    primary: string;
    secondary: string;
    glow: string;
  };
  effects: {
    particleCount: number;
    duration: number;
    hasScreenShake: boolean;
    hasFireworks: boolean;
    hasRichRain: boolean;
  };
  sound: string;
}

export const giftLevelConfigs: Record<GiftLevel, GiftLevelConfig> = {
  basic: {
    level: 'basic',
    name: 'Yêu Thương',
    emoji: '💕',
    minAmount: 0,
    maxAmount: 999,
    colors: {
      primary: '#FF69B4',
      secondary: '#FFB6C1',
      glow: 'rgba(255, 105, 180, 0.5)',
    },
    effects: {
      particleCount: 15,
      duration: 3000,
      hasScreenShake: false,
      hasFireworks: false,
      hasRichRain: false,
    },
    sound: '/sounds/gift-rich-1.mp3',
  },
  silver: {
    level: 'silver',
    name: 'Bạc Sáng',
    emoji: '🥈',
    minAmount: 1000,
    maxAmount: 9999,
    colors: {
      primary: '#C0C0C0',
      secondary: '#E8E8E8',
      glow: 'rgba(192, 192, 192, 0.6)',
    },
    effects: {
      particleCount: 50,
      duration: 5000,
      hasScreenShake: false,
      hasFireworks: false,
      hasRichRain: false,
    },
    sound: '/sounds/gift-rich-2.mp3',
  },
  gold: {
    level: 'gold',
    name: 'Vàng Rực',
    emoji: '🏆',
    minAmount: 10000,
    maxAmount: 99999,
    colors: {
      primary: '#FFD700',
      secondary: '#FFA500',
      glow: 'rgba(255, 215, 0, 0.7)',
    },
    effects: {
      particleCount: 100,
      duration: 7000,
      hasScreenShake: false,
      hasFireworks: true,
      hasRichRain: false,
    },
    sound: '/sounds/gift-rich-3.mp3',
  },
  diamond: {
    level: 'diamond',
    name: 'Kim Cương',
    emoji: '💎',
    minAmount: 100000,
    maxAmount: Infinity,
    colors: {
      primary: '#00CED1',
      secondary: '#E0FFFF',
      glow: 'rgba(0, 206, 209, 0.8)',
    },
    effects: {
      particleCount: 200,
      duration: 10000,
      hasScreenShake: true,
      hasFireworks: true,
      hasRichRain: true,
    },
    sound: '/sounds/gift-rich-3.mp3',
  },
};

export function getGiftLevel(amount: number): GiftLevelConfig {
  if (amount >= 100000) return giftLevelConfigs.diamond;
  if (amount >= 10000) return giftLevelConfigs.gold;
  if (amount >= 1000) return giftLevelConfigs.silver;
  return giftLevelConfigs.basic;
}

export function parseAmountFromString(amountStr: string): number {
  const s = (amountStr || '').trim();
  if (!s) return 0;

  // Support shorthand like 10K, 10.5K, 2M, 1.2B (commas/dots/space allowed)
  const m = s.match(/^([0-9]+(?:[\.,][0-9]+)?)\s*([kKmMbB])?$/);
  if (m) {
    const base = parseFloat(m[1].replace(/,/g, '.'));
    const suffix = (m[2] || '').toUpperCase();
    const mult = suffix === 'K' ? 1_000 : suffix === 'M' ? 1_000_000 : suffix === 'B' ? 1_000_000_000 : 1;
    return Math.round(base * mult) || 0;
  }

  // Fallback: remove separators and parse
  return parseInt(s.replace(/[^0-9]/g, ''), 10) || 0;
}
