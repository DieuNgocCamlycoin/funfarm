// 🧚 FUN FARM Angel Companion - Thiên thần đồng hành với GIF Animation (nền trong suốt)
// Kịch bản Animation v2: Mượt mà, có câu chuyện, kết nối cảm xúc với user.
// Bổ sung duy nhất: Angel lịch sự tránh vùng nhập liệu/chat/tặng quà khi người dùng thao tác.
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Import GIF animations (hỗ trợ nền trong suốt)
import angelIdleGif from '@/assets/angel-gifs/angel-idle.gif';
import angelDancingGif from '@/assets/angel-gifs/angel-dancing.gif';
import angelSleepingGif from '@/assets/angel-gifs/angel-sleeping.gif';
import angelWakingGif from '@/assets/angel-gifs/angel-waking.gif';
import angelExcitedGif from '@/assets/angel-gifs/angel-excited.gif';
import angelSittingGif from '@/assets/angel-gifs/angel-sitting.gif';
import angelAppearingGif from '@/assets/angel-gifs/angel-appearing.gif';
import angelHidingGif from '@/assets/angel-gifs/angel-hiding.gif';
import angelSpecialGif from '@/assets/angel-gifs/angel-special.gif';
import angelFlyingRightGif from '@/assets/angel-gifs/angel-flying-right.gif';
import angelFlyingLeftGif from '@/assets/angel-gifs/angel-flying-left.gif';
import angelHoveringSparkleGif from '@/assets/angel-gifs/angel-hovering-sparkle.gif';
import angelHoveringGif from '@/assets/angel-gifs/angel-hovering.gif';
import angelDanceJumpGif from '@/assets/angel-gifs/angel-dance-jump.gif';
import angelSpinDanceGif from '@/assets/angel-gifs/angel-spin-dance.gif';
import angelWakeUpGif from '@/assets/angel-gifs/angel-wake-up.gif';
import angelClappingGif from '@/assets/angel-gifs/angel-clapping.gif';
import angelClapping2Gif from '@/assets/angel-gifs/angel-clapping2.gif';
import angelCoinCelebrationGif from '@/assets/angel-gifs/angel-coin-celebration.gif';
import angelHovering2Gif from '@/assets/angel-gifs/angel-hovering-2.gif';
import angelDanceJump2Gif from '@/assets/angel-gifs/angel-dance-jump-2.gif';
import angelHappyJumpGif from '@/assets/angel-gifs/angel-happy-jump.gif';
import angelHeartGif from '@/assets/angel-gifs/angel-heart.gif';
import angelWavingGif from '@/assets/angel-gifs/angel-waving.gif';

// ============= TYPES & CONSTANTS =============

export type AngelState = 
  // Trạng thái Tĩnh (Resting)
  | 'idle'           // Chấp tay chờ đợi - mặc định
  | 'hovering'       // Bay nhẹ tại chỗ
  | 'hoveringSparkle'// Bay với ánh sáng
  | 'sitting'        // Ngồi nghỉ trên element
  | 'sleeping'       // Ngủ say
  // Trạng thái Chuyển động (Movement)
  | 'following'      // Bay theo cursor
  | 'wandering'      // Bay tự do
  // Trạng thái One-shot (Reaction)
  | 'waving'         // Vẫy tay chào
  | 'waking'         // Đang tỉnh dậy
  | 'wakeUp'         // Hoàn toàn thức
  | 'appearing'      // Xuất hiện
  | 'hiding'         // Biến mất
  | 'special'        // Chấp tay cảm ơn
  // Trạng thái Vui vẻ (Celebration)
  | 'excited'        // Nhảy ăn mừng
  | 'happyJump'      // Nhảy vui vẻ
  | 'dancing'        // Múa ngôi sao
  | 'danceJump'      // Nhảy múa
  | 'spinning'       // Xoay tròn
  | 'clapping'       // Vỗ tay
  | 'sendingHeart'   // Thả tim
  | 'coinCelebration'; // Ăn mừng tiền vàng

interface Sparkle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

// Map trạng thái với GIF
// idle giờ dùng hovering-sparkle để mượt mà hơn (không có hiệu ứng zoom xa/gần)
const STATE_GIFS: Record<AngelState, string> = {
  idle: angelHoveringSparkleGif,  // ✨ Mặc định bay lấp lánh - ổn định, đẹp
  hovering: angelHoveringGif,
  hoveringSparkle: angelHoveringSparkleGif,
  sitting: angelSittingGif,
  sleeping: angelSleepingGif,
  following: angelFlyingRightGif,
  wandering: angelFlyingRightGif,
  waving: angelWavingGif,
  waking: angelWakingGif,
  wakeUp: angelWakeUpGif,
  appearing: angelAppearingGif,
  hiding: angelHidingGif,
  special: angelSpecialGif,
  excited: angelExcitedGif,
  happyJump: angelHappyJumpGif,
  dancing: angelDancingGif,
  danceJump: angelDanceJumpGif,
  spinning: angelSpinDanceGif,
  clapping: angelClappingGif,
  sendingHeart: angelHeartGif,
  coinCelebration: angelCoinCelebrationGif,
};

// GIFs bay trái/phải
const FLYING_GIFS = {
  right: angelFlyingRightGif,
  left: angelFlyingLeftGif,
};

// Variant arrays for random selection
const CLAPPING_GIFS = [angelClappingGif, angelClapping2Gif];
const HOVERING_GIFS = [angelHoveringGif, angelHovering2Gif];
const DANCE_JUMP_GIFS = [angelDanceJumpGif, angelDanceJump2Gif];

// ============= TIMING CONFIGURATION =============
// Thời gian chuyển đổi mượt mà cho one-shot animations
const ONE_SHOT_DURATIONS: Partial<Record<AngelState, number>> = {
  waving: 2500,          // Chào user đủ lâu để ấm áp
  waking: 2000,          // Đang tỉnh
  wakeUp: 1500,          // Hoàn toàn thức
  appearing: 2000,       // Xuất hiện rõ ràng
  hiding: 1500,          // Biến mất nhanh
  excited: 2500,         // Ăn mừng vừa đủ
  happyJump: 2000,       // Nhảy vui
  dancing: 4000,         // Múa đủ lâu để thấy đẹp
  danceJump: 3000,       // Nhảy múa
  spinning: 2500,        // Xoay vừa đủ
  clapping: 2500,        // Vỗ tay
  sendingHeart: 2500,    // Thả tim với tình yêu
  coinCelebration: 4000, // Ăn mừng tiền - sự kiện lớn
  special: 3000,         // Cảm ơn thành kính
};

// ============= RANDOM BEHAVIORS - SÔI ĐỘNG HƠN =============
// Interval 8s để Angel hoạt động sôi động hơn
const BEHAVIOR_INTERVAL = 8000;

const RANDOM_BEHAVIORS: { action: AngelState; chance: number; duration: number }[] = [
  // ⬆️ TĂNG chance cho các animation vui vẻ - sôi động hơn!
  { action: 'happyJump', chance: 0.06, duration: 2000 },   // Gấp đôi
  { action: 'danceJump', chance: 0.06, duration: 3000 },   // Gấp đôi
  { action: 'spinning', chance: 0.05, duration: 2500 },    // Gấp 2.5
  { action: 'dancing', chance: 0.05, duration: 4000 },     // Gấp 2.5
  { action: 'clapping', chance: 0.04, duration: 2500 },    // Gấp đôi
  
  // Giảm hovering vì idle đã là hovering-sparkle rồi
  { action: 'hovering', chance: 0.03, duration: 5000 },
  { action: 'wandering', chance: 0.04, duration: 4000 },
  
  // Hành vi hiếm - tạo bất ngờ đặc biệt
  { action: 'sitting', chance: 0.02, duration: 8000 },
  { action: 'sleeping', chance: 0.01, duration: 15000 },
  { action: 'hiding', chance: 0.01, duration: 1500 },
  { action: 'waving', chance: 0.02, duration: 2500 },
  { action: 'special', chance: 0.01, duration: 3000 },
];

// ============= VISUAL CONSTANTS =============
const ANGEL_SIZE = 220;        // Angel lớn, rực rỡ và hiện diện rõ trên FUN FARM
const SAFE_DISTANCE = 145;
const OFFSET_ANGLE = Math.PI / 4;

const BRIGHTNESS_LEVELS: Record<number, string> = {
  1: 'brightness(0.8)',
  2: 'brightness(0.9)',
  3: 'brightness(1.0)',
  4: 'brightness(1.15)',
  5: 'brightness(1.3) saturate(0.9)',
  6: 'brightness(1.5) saturate(0.8) contrast(1.1)',
};

const DEFAULT_GLOW = 'drop-shadow(0 0 25px rgba(255, 215, 0, 0.6)) drop-shadow(0 0 50px rgba(255, 182, 193, 0.4))';

const isQuietInteraction = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(
    'input, textarea, [contenteditable="true"], [role="textbox"], [role="dialog"], [data-angel-quiet-zone]'
  ));
};

// ============= COMPONENT =============

interface AngelCompanionProps {
  enabled?: boolean;
  brightness?: number;
}

const AngelCompanion: React.FC<AngelCompanionProps> = ({ 
  enabled = true, 
  brightness = 3 
}) => {
  // Position & Movement
  const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [targetPosition, setTargetPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isMoving, setIsMoving] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // State Management
  const [state, setState] = useState<AngelState>('waving');
  const [isHidden, setIsHidden] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  
  // Variants for random GIF selection
  const [clappingVariant, setClappingVariant] = useState(0);
  const [hoveringVariant, setHoveringVariant] = useState(0);
  const [danceJumpVariant, setDanceJumpVariant] = useState(0);
  
  // Visual Effects
  const [particles, setParticles] = useState<Sparkle[]>([]);
  
  // Refs for timers
  const lastMoveTime = useRef(Date.now());
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const idleTimer = useRef<NodeJS.Timeout>();
  const behaviorTimer = useRef<NodeJS.Timeout>();
  const wanderTimer = useRef<NodeJS.Timeout>();
  const transitionTimer = useRef<NodeJS.Timeout>();
  const frameRef = useRef<number>();
  const quietInteractionRef = useRef(false);

  // ============= FLOW 1: INITIAL GREETING =============
  useEffect(() => {
    if (!enabled || hasGreeted) return;
    
    // Angel vẫy tay chào khi load trang
    setState('waving');
    setHasGreeted(true);
    
    // Flow: waving → hovering → idle
    const greetTimer = setTimeout(() => {
      setState('hovering');
      setHoveringVariant(Math.random() < 0.5 ? 0 : 1);
      
      setTimeout(() => {
        setState('idle');
      }, 3000);
    }, 2500);
    
    return () => clearTimeout(greetTimer);
  }, [enabled, hasGreeted]);

  // ============= PRELOAD GIFS =============
  useEffect(() => {
    const allGifs = [
      ...Object.values(STATE_GIFS),
      ...Object.values(FLYING_GIFS),
      ...CLAPPING_GIFS,
      ...HOVERING_GIFS,
      ...DANCE_JUMP_GIFS,
    ];
    allGifs.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // ============= ONE-SHOT ANIMATION HANDLER =============
  useEffect(() => {
    const duration = ONE_SHOT_DURATIONS[state];
    if (duration && hasGreeted && state !== 'waving') {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      
      transitionTimer.current = setTimeout(() => {
        setIsSpinning(false);
        
        // Flow mượt: thêm bước chuyển tiếp trước khi về idle
        if (state === 'sleeping') {
          // sleeping → waking → wakeUp → idle
          setState('waking');
        } else if (state === 'waking') {
          setState('wakeUp');
        } else if (state === 'wakeUp') {
          setState('idle');
        } else if (state === 'hiding') {
          setIsHidden(true);
          setTimeout(() => {
            setIsHidden(false);
            setState('appearing');
          }, 500);
        } else if (state === 'appearing') {
          // appearing → hovering → idle
          setState('hovering');
          setTimeout(() => setState('idle'), 2000);
        } else {
          setState('idle');
        }
      }, duration);
      
      return () => {
        if (transitionTimer.current) clearTimeout(transitionTimer.current);
      };
    }
  }, [state, hasGreeted]);

  // ============= SPINNING STATE =============
  useEffect(() => {
    if (state === 'spinning') {
      setIsSpinning(true);
    }
  }, [state]);

  // ============= SMOOTH POSITION INTERPOLATION =============
  useEffect(() => {
    if (!enabled) return;
    
    const animate = () => {
      setPosition(prev => {
        const dx = targetPosition.x - prev.x;
        const dy = targetPosition.y - prev.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1) return prev;
        
        // Tốc độ khác nhau cho từng trạng thái
        const speed = isSitting ? 0.02 : state === 'wandering' ? 0.03 : 0.05;
        return {
          x: prev.x + dx * speed,
          y: prev.y + dy * speed,
        };
      });
      
      frameRef.current = requestAnimationFrame(animate);
    };
    
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [targetPosition, enabled, isSitting, state]);

  // ============= CREATE SPARKLE PARTICLES =============
  const createSparkle = useCallback((x: number, y: number) => {
    const colors = ['#ffd700', '#ff69b4', '#00ff88', '#87ceeb', '#ff6b6b', '#da70d6'];
    const newSparkle: Sparkle = {
      id: Date.now() + Math.random(),
      x: x + (Math.random() - 0.5) * 80,
      y: y + (Math.random() - 0.5) * 80,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 10 + Math.random() * 16,
      rotation: Math.random() * 360,
    };
    
    setParticles(prev => [...prev.slice(-15), newSparkle]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newSparkle.id));
    }, 1000);
  }, []);

  // ============= FLOW 2: MOUSE MOVE HANDLER =============
  // Theo dõi hướng và tốc độ di chuyển để chọn GIF bay phù hợp
  const [flyDirection, setFlyDirection] = useState<'left' | 'right'>('right');
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled || isHidden || isSitting) return;

    // Phần bổ sung duy nhất: tránh con trỏ trong vùng nhập liệu và modal thao tác.
    if (isQuietInteraction(e.target)) {
      if (!quietInteractionRef.current) {
        quietInteractionRef.current = true;
        const retreatX = e.clientX < window.innerWidth / 2
          ? window.innerWidth - ANGEL_SIZE * 0.38
          : ANGEL_SIZE * 0.38;
        const retreatY = Math.max(ANGEL_SIZE * 0.45, Math.min(window.innerHeight - ANGEL_SIZE * 0.45, e.clientY - ANGEL_SIZE * 0.7));
        setTargetPosition({ x: retreatX, y: retreatY });
        setState('hovering');
      }
      return;
    }
    quietInteractionRef.current = false;
    
    const now = Date.now();
    const timeDelta = now - lastMoveTime.current;
    lastMoveTime.current = now;
    
    // Xác định hướng di chuyển (trái/phải) dựa vào vị trí chuột
    const dx = e.clientX - lastMousePosition.current.x;
    if (Math.abs(dx) > 3) {
      const newDirection = dx > 0 ? 'right' : 'left';
      setFlyDirection(newDirection);
      setIsFlipped(dx < 0);
    }
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
    
    // Khôi phục nguyên quỹ đạo cũ: Angel bay dọc rìa đối diện con trỏ.
    const edgeInset = ANGEL_SIZE * 0.34;
    const newX = e.clientX < window.innerWidth / 2
      ? window.innerWidth - edgeInset
      : edgeInset;
    const offsetY = Math.sin(OFFSET_ANGLE) * SAFE_DISTANCE;
    const navSafeTop = 64 + ANGEL_SIZE / 2;
    const newY = Math.max(
      navSafeTop,
      Math.min(window.innerHeight - ANGEL_SIZE / 2, e.clientY - offsetY),
    );
    
    setTargetPosition({ x: newX, y: newY });
    
    if (!isMoving) {
      setIsMoving(true);
      setState('following');
    }
    
    // Sparkle trail - giảm tần suất
    if (Math.random() > 0.75) {
      createSparkle(position.x, position.y);
    }
    
    // Flow: following → idle (vì idle đã là hovering-sparkle rồi)
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setIsMoving(false);
      if (!isSitting) {
        // Trực tiếp về idle vì idle đã là bay lấp lánh
        setState('idle');
      }
    }, 400);
  }, [enabled, isHidden, isSitting, isMoving, createSparkle, position]);

  // ============= FLOW 4: CLICK HANDLER =============
  const handleClick = useCallback((event: MouseEvent) => {
    if (!enabled || isHidden || isQuietInteraction(event.target)) return;
    
    // Chỉ chọn từ các animation vui vẻ phù hợp
    const actions: AngelState[] = [
      'excited', 'happyJump', 'danceJump', 'clapping', 'spinning'
    ];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    
    // Set variants for animations with multiple GIFs
    if (randomAction === 'clapping') {
      setClappingVariant(Math.random() < 0.5 ? 0 : 1);
    }
    if (randomAction === 'danceJump') {
      setDanceJumpVariant(Math.random() < 0.5 ? 0 : 1);
    }
    if (randomAction === 'spinning') {
      setIsSpinning(true);
    }
    
    setState(randomAction);
    
    // Burst of sparkles
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        createSparkle(position.x, position.y);
      }, i * 50);
    }
  }, [enabled, isHidden, position, createSparkle]);

  // ============= PERCH SPOT DETECTION =============
  const checkPerchSpots = useCallback(() => {
    if (!enabled || isHidden || isMoving) return;

    const perchElements = document.querySelectorAll('[data-angel-perch]');
    perchElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const distance = Math.hypot(position.x - (rect.left + rect.width / 2), position.y - rect.top);
      if (distance < 150 && Math.random() < 0.015) {
        setIsSitting(true);
        setState('sitting');
        setTargetPosition({ x: rect.left + rect.width / 2, y: rect.top - 40 });
        setTimeout(() => {
          setIsSitting(false);
          setState('hovering');
          setTimeout(() => setState('idle'), 2000);
        }, 8000 + Math.random() * 7000);
      }
    });
  }, [enabled, isHidden, isMoving, position]);

  // ============= WANDERING - BAY TỰ DO =============
  const startWandering = useCallback(() => {
    if (!enabled || isMoving || isSitting || isHidden) return;
    
    const edgeInset = ANGEL_SIZE * 0.34;
    const newX = Math.random() < 0.5 ? edgeInset : window.innerWidth - edgeInset;
    const newY = 64 + ANGEL_SIZE / 2 + Math.random() * Math.max(0, window.innerHeight - 64 - ANGEL_SIZE * 1.5);
    
    setIsFlipped(newX < position.x);
    setState('wandering');
    setTargetPosition({ x: newX, y: newY });
    
    // Flow: wandering → hovering → idle
    setTimeout(() => {
      setHoveringVariant(Math.random() < 0.5 ? 0 : 1);
      setState('hovering');
      setTimeout(() => setState('idle'), 2500);
    }, 4000);
  }, [enabled, isMoving, isSitting, isHidden, position.x]);

  // ============= FLOW 5: RANDOM BEHAVIORS =============
  useEffect(() => {
    if (!enabled || state !== 'idle' || isMoving || !hasGreeted) return;
    
    behaviorTimer.current = setInterval(() => {
      const random = Math.random();
      let cumulative = 0;
      
      for (const behavior of RANDOM_BEHAVIORS) {
        cumulative += behavior.chance;
        if (random < cumulative) {
          // Handle each behavior với flow phù hợp
          switch (behavior.action) {
            case 'wandering':
              startWandering();
              break;
            case 'spinning':
              setIsSpinning(true);
              setState('spinning');
              break;
            case 'hiding':
              setState('hiding');
              // hiding → appearing handled by one-shot timer
              break;
            case 'sleeping':
              setState('sleeping');
              // sleeping → waking → wakeUp handled by one-shot timer
              break;
            case 'clapping':
              setClappingVariant(Math.random() < 0.5 ? 0 : 1);
              setState('clapping');
              break;
            case 'hovering':
              setHoveringVariant(Math.random() < 0.5 ? 0 : 1);
              setState('hovering');
              setTimeout(() => setState('idle'), behavior.duration);
              break;
            case 'danceJump':
              setDanceJumpVariant(Math.random() < 0.5 ? 0 : 1);
              setState('danceJump');
              break;
            default:
              setState(behavior.action);
              break;
          }
          break;
        }
      }
      
      checkPerchSpots();
    }, BEHAVIOR_INTERVAL);
    
    return () => {
      if (behaviorTimer.current) clearInterval(behaviorTimer.current);
    };
  }, [enabled, state, isMoving, checkPerchSpots, startWandering, hasGreeted]);

  // ============= EVENT LISTENERS =============
  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
    };
  }, [enabled, handleMouseMove, handleClick]);

  // ============= CLEANUP =============
  useEffect(() => {
    return () => {
      if (wanderTimer.current) clearTimeout(wanderTimer.current);
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, []);

  if (!enabled) return null;

  // ============= GET CURRENT GIF =============
  const getCurrentGif = () => {
    // Bay theo hướng di chuyển của chuột
    if (state === 'following' || state === 'wandering') {
      return flyDirection === 'left' ? FLYING_GIFS.left : FLYING_GIFS.right;
    }
    if (state === 'clapping') {
      return CLAPPING_GIFS[clappingVariant];
    }
    if (state === 'hovering') {
      return HOVERING_GIFS[hoveringVariant];
    }
    if (state === 'danceJump') {
      return DANCE_JUMP_GIFS[danceJumpVariant];
    }
    return STATE_GIFS[state];
  };

  const currentGif = getCurrentGif();
  const halfSize = ANGEL_SIZE / 2;
  const brightnessFilter = BRIGHTNESS_LEVELS[brightness] || BRIGHTNESS_LEVELS[3];
  const combinedFilter = [DEFAULT_GLOW, brightnessFilter].filter(Boolean).join(' ');

  // ============= RENDER =============
  return (
    <div className="fixed inset-0 pointer-events-none z-[10000]">
      {/* Sparkle particles */}
      {particles.map(particle => (
        <svg
          key={particle.id}
          className="absolute animate-sparkle-fade"
          style={{
            left: particle.x - particle.size / 2,
            top: particle.y - particle.size / 2,
            width: particle.size,
            height: particle.size,
            transform: `rotate(${particle.rotation}deg)`,
          }}
          viewBox="0 0 24 24"
        >
          <path
            d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z"
            fill={particle.color}
            style={{ filter: `drop-shadow(0 0 6px ${particle.color})` }}
          />
        </svg>
      ))}
      
      {/* Angel GIF */}
      <div
        className={`absolute transition-all duration-500 ${isHidden ? 'opacity-0 scale-0' : 'opacity-100'}`}
        style={{
          left: position.x - halfSize,
          top: position.y - halfSize - 20,
          width: ANGEL_SIZE,
          height: 'auto',
          filter: combinedFilter,
          transform: `${isFlipped && state !== 'following' && state !== 'wandering' ? 'scaleX(-1)' : 'scaleX(1)'} ${isSpinning ? 'rotate(360deg)' : 'rotate(0deg)'}`,
          transition: isSpinning ? 'transform 0.8s ease-in-out' : 'transform 0.3s ease-out',
        }}
      >
        <div
          className="relative"
          style={{
            mask: 'radial-gradient(ellipse 48% 48% at center, black 70%, transparent 100%)',
            WebkitMask: 'radial-gradient(ellipse 48% 48% at center, black 70%, transparent 100%)',
          }}
        >
          <img
            key={currentGif}
            src={currentGif}
            alt="Angel Fun Farm"
            className="w-full h-auto"
            style={{ transformOrigin: 'center center' }}
            draggable={false}
          />
        </div>
        
        {/* ===== VISUAL EFFECTS ===== */}
        
        {/* Sleeping Z's */}
        {state === 'sleeping' && (
          <div className="absolute -top-4 right-0" style={{ transform: isFlipped ? 'scaleX(-1)' : 'none' }}>
            <span className="text-2xl animate-zzz-float text-blue-300" style={{ textShadow: '0 0 10px rgba(147, 197, 253, 0.8)' }}>
              💤
            </span>
          </div>
        )}
        
        {/* Excitement stars - cho các state vui */}
        {(state === 'excited' || state === 'special' || state === 'danceJump' || state === 'happyJump') && (
          <>
            <span className="absolute -top-4 -left-4 text-xl animate-bounce">✨</span>
            <span className="absolute -top-4 -right-4 text-xl animate-bounce" style={{ animationDelay: '0.1s' }}>✨</span>
            <span className="absolute top-1/2 -left-6 text-lg animate-ping">💫</span>
            <span className="absolute top-1/2 -right-6 text-lg animate-ping" style={{ animationDelay: '0.2s' }}>💫</span>
          </>
        )}
        
        {/* Dancing music notes */}
        {(state === 'dancing' || state === 'danceJump' || state === 'happyJump') && (
          <>
            <span className="absolute -top-6 left-0 text-xl animate-bounce">🎵</span>
            <span className="absolute -top-8 right-0 text-xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎶</span>
            <span className="absolute -top-4 left-1/2 text-lg animate-bounce" style={{ animationDelay: '0.4s' }}>🎵</span>
          </>
        )}
        
        {/* Flying trail */}
        {(state === 'wandering' || state === 'following') && (
          <>
            <span className="absolute top-1/2 -left-4 text-sm opacity-60">✨</span>
            <span className="absolute top-1/2 -left-8 text-xs opacity-40">✨</span>
          </>
        )}
        
        {/* Hovering sparkle effect */}
        {state === 'hoveringSparkle' && (
          <>
            <span className="absolute -top-2 left-1/4 text-lg animate-pulse">✨</span>
            <span className="absolute -top-2 right-1/4 text-lg animate-pulse" style={{ animationDelay: '0.3s' }}>✨</span>
            <span className="absolute bottom-0 left-1/2 text-sm animate-pulse" style={{ animationDelay: '0.5s' }}>🌟</span>
          </>
        )}
        
        {/* Clapping effect */}
        {state === 'clapping' && (
          <>
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xl animate-bounce">👏</span>
            <span className="absolute top-0 -left-4 text-sm animate-ping">✨</span>
            <span className="absolute top-0 -right-4 text-sm animate-ping" style={{ animationDelay: '0.2s' }}>✨</span>
          </>
        )}
        
        {/* Sending heart effect */}
        {state === 'sendingHeart' && (
          <>
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-bounce">💕</span>
            <span className="absolute -top-10 left-1/4 text-lg animate-ping" style={{ animationDelay: '0.1s' }}>💗</span>
            <span className="absolute -top-10 right-1/4 text-lg animate-ping" style={{ animationDelay: '0.3s' }}>💗</span>
          </>
        )}
        
        {/* Waving effect */}
        {state === 'waving' && (
          <>
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xl animate-bounce">👋</span>
            <span className="absolute -top-2 -right-2 text-lg animate-pulse">✨</span>
          </>
        )}
        
        {/* Coin celebration effect */}
        {state === 'coinCelebration' && (
          <>
            <span className="absolute -top-6 left-0 text-xl animate-bounce">🪙</span>
            <span className="absolute -top-8 right-0 text-xl animate-bounce" style={{ animationDelay: '0.1s' }}>💰</span>
            <span className="absolute -top-10 left-1/2 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎉</span>
            <span className="absolute top-1/4 -left-6 text-lg animate-ping">✨</span>
            <span className="absolute top-1/4 -right-6 text-lg animate-ping" style={{ animationDelay: '0.15s' }}>✨</span>
          </>
        )}
        
        {/* Happy jump effect */}
        {state === 'happyJump' && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl animate-bounce">🌟</span>
        )}
        
        {/* Spinning effect - không cần icon che mặt nữa */}
      </div>
    </div>
  );
};

export default AngelCompanion;
