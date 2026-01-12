// 🧚 FUN FARM Angel Companion - Thiên thần đồng hành với GIF Animation (nền trong suốt)
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Import GIF animations (hỗ trợ nền trong suốt - không cần mix-blend-mode)
import angelIdleGif from '@/assets/angel-gifs/angel-idle.gif';
import angelDancingGif from '@/assets/angel-gifs/angel-dancing.gif';
import angelSleepingGif from '@/assets/angel-gifs/angel-sleeping.gif';
import angelWakingGif from '@/assets/angel-gifs/angel-waking.gif';
import angelExcitedGif from '@/assets/angel-gifs/angel-excited.gif';
import angelSittingGif from '@/assets/angel-gifs/angel-sitting.gif';
import angelAppearingGif from '@/assets/angel-gifs/angel-appearing.gif';
import angelHidingGif from '@/assets/angel-gifs/angel-hiding.gif';
import angelFlyingGif from '@/assets/angel-gifs/angel-flying.gif';
import angelSpecialGif from '@/assets/angel-gifs/angel-special.gif';
// NEW GIFs - Thêm mới
import angelFlyingRightGif from '@/assets/angel-gifs/angel-flying-right.gif';
import angelFlyingLeftGif from '@/assets/angel-gifs/angel-flying-left.gif';
import angelHoveringSparkleGif from '@/assets/angel-gifs/angel-hovering-sparkle.gif';
import angelHoveringGif from '@/assets/angel-gifs/angel-hovering.gif';
import angelDanceJumpGif from '@/assets/angel-gifs/angel-dance-jump.gif';
import angelSpinDanceGif from '@/assets/angel-gifs/angel-spin-dance.gif';
import angelWakeUpGif from '@/assets/angel-gifs/angel-wake-up.gif';
import angelClappingGif from '@/assets/angel-gifs/angel-clapping.gif';
import angelClapping2Gif from '@/assets/angel-gifs/angel-clapping2.gif';
// 6 NEW GIFs - Batch 3
import angelCoinCelebrationGif from '@/assets/angel-gifs/angel-coin-celebration.gif';
import angelHovering2Gif from '@/assets/angel-gifs/angel-hovering-2.gif';
import angelDanceJump2Gif from '@/assets/angel-gifs/angel-dance-jump-2.gif';
import angelHappyJumpGif from '@/assets/angel-gifs/angel-happy-jump.gif';
import angelHeartGif from '@/assets/angel-gifs/angel-heart.gif';
import angelWavingGif from '@/assets/angel-gifs/angel-waving.gif';

export type AngelState = 
  | 'idle'
  | 'following'
  | 'dancing'
  | 'sleeping'
  | 'waking'
  | 'sitting'
  | 'hiding'
  | 'appearing'
  | 'excited'
  | 'flying'
  | 'special'
  | 'wandering'
  | 'spinning'
  // NEW States
  | 'hovering'
  | 'hoveringSparkle'
  | 'danceJump'
  | 'clapping'
  // 4 NEW States - Batch 3
  | 'coinCelebration'
  | 'happyJump'
  | 'sendingHeart'
  | 'waving';

interface Sparkle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

// Map trạng thái với GIF
const STATE_GIFS: Record<AngelState, string> = {
  idle: angelIdleGif,
  following: angelFlyingRightGif, // Sử dụng GIF bay mới
  dancing: angelDancingGif,
  sleeping: angelSleepingGif,
  waking: angelWakeUpGif, // GIF thức dậy mới
  sitting: angelSittingGif,
  hiding: angelHidingGif,
  appearing: angelAppearingGif,
  excited: angelExcitedGif,
  flying: angelFlyingGif,
  special: angelSpecialGif,
  wandering: angelFlyingRightGif, // Sử dụng GIF bay mới
  spinning: angelSpinDanceGif, // GIF xoay tròn mới
  // NEW mappings
  hovering: angelHoveringGif,
  hoveringSparkle: angelHoveringSparkleGif,
  danceJump: angelDanceJumpGif,
  clapping: angelClappingGif,
  // 4 NEW mappings - Batch 3
  coinCelebration: angelCoinCelebrationGif,
  happyJump: angelHappyJumpGif,
  sendingHeart: angelHeartGif,
  waving: angelWavingGif,
};

// GIFs bay trái/phải để sử dụng khi flip
const FLYING_GIFS = {
  right: angelFlyingRightGif,
  left: angelFlyingLeftGif,
};

// Variant arrays for random selection
const CLAPPING_GIFS = [angelClappingGif, angelClapping2Gif];
const HOVERING_GIFS = [angelHoveringGif, angelHovering2Gif];
const DANCE_JUMP_GIFS = [angelDanceJumpGif, angelDanceJump2Gif];

// Các trạng thái one-shot với thời gian chuyển về idle
const ONE_SHOT_DURATIONS: Partial<Record<AngelState, number>> = {
  waking: 2000,
  appearing: 1500,
  excited: 2000,
  special: 3000,
  spinning: 2000,
  danceJump: 3000,
  clapping: 2500,
  // 4 NEW durations
  coinCelebration: 3500,
  happyJump: 2000,
  sendingHeart: 2500,
  waving: 2000,
};

// Random behaviors khi idle - đa dạng hơn với actions mới
const RANDOM_BEHAVIORS: { action: AngelState; chance: number; duration: number }[] = [
  { action: 'dancing', chance: 0.05, duration: 4000 },
  { action: 'sleeping', chance: 0.02, duration: 8000 },
  { action: 'hiding', chance: 0.02, duration: 5000 },
  { action: 'excited', chance: 0.04, duration: 2000 },
  { action: 'spinning', chance: 0.04, duration: 2000 },
  { action: 'special', chance: 0.02, duration: 3000 },
  { action: 'wandering', chance: 0.07, duration: 4000 },
  // NEW behaviors
  { action: 'hovering', chance: 0.06, duration: 5000 },
  { action: 'hoveringSparkle', chance: 0.05, duration: 4000 },
  { action: 'danceJump', chance: 0.04, duration: 3000 },
  { action: 'clapping', chance: 0.04, duration: 2500 },
  // 4 NEW behaviors - Batch 3
  { action: 'happyJump', chance: 0.04, duration: 2000 },
  { action: 'waving', chance: 0.03, duration: 2000 },
  { action: 'sendingHeart', chance: 0.03, duration: 2500 },
  { action: 'coinCelebration', chance: 0.02, duration: 3500 },
];

// Kích thước Angel và khoảng cách an toàn
const ANGEL_SIZE = 180;
const SAFE_DISTANCE = 100;
const OFFSET_ANGLE = Math.PI / 4; // 45 độ

// Brightness Levels - độ sáng da
const BRIGHTNESS_LEVELS: Record<number, string> = {
  1: 'brightness(0.8)',
  2: 'brightness(0.9)',
  3: 'brightness(1.0)', // Mặc định
  4: 'brightness(1.15)',
  5: 'brightness(1.3) saturate(0.9)',
  6: 'brightness(1.5) saturate(0.8) contrast(1.1)', // Trắng sáng nhất
};

// Default glow effect
const DEFAULT_GLOW = 'drop-shadow(0 0 25px rgba(255, 215, 0, 0.6)) drop-shadow(0 0 50px rgba(255, 182, 193, 0.4))';

interface AngelCompanionProps {
  enabled?: boolean;
  brightness?: number;
}

const AngelCompanion: React.FC<AngelCompanionProps> = ({ 
  enabled = true, 
  brightness = 3 
}) => {
  const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [targetPosition, setTargetPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [state, setState] = useState<AngelState>('waving'); // Start with waving to greet user
  const [particles, setParticles] = useState<Sparkle[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [clappingVariant, setClappingVariant] = useState(0);
  const [hoveringVariant, setHoveringVariant] = useState(0);
  const [danceJumpVariant, setDanceJumpVariant] = useState(0);
  const [hasGreeted, setHasGreeted] = useState(false);
  
  const lastMoveTime = useRef(Date.now());
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const idleTimer = useRef<NodeJS.Timeout>();
  const behaviorTimer = useRef<NodeJS.Timeout>();
  const wanderTimer = useRef<NodeJS.Timeout>();
  const frameRef = useRef<number>();

  // Initial greeting animation
  useEffect(() => {
    if (!enabled || hasGreeted) return;
    
    // Angel waves to greet user on page load
    setState('waving');
    setHasGreeted(true);
    
    const greetTimer = setTimeout(() => {
      setState('idle');
    }, 2500);
    
    return () => clearTimeout(greetTimer);
  }, [enabled, hasGreeted]);

  // Preload all GIFs for smooth transitions
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

  // Handle one-shot animations với setTimeout (GIF không có onEnded event)
  useEffect(() => {
    const duration = ONE_SHOT_DURATIONS[state];
    if (duration && hasGreeted) {
      const timer = setTimeout(() => {
        setIsSpinning(false);
        setState('idle');
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [state, hasGreeted]);

  // Handle spinning state
  useEffect(() => {
    if (state === 'spinning') {
      setIsSpinning(true);
    }
  }, [state]);

  // Smooth position interpolation
  useEffect(() => {
    if (!enabled) return;
    
    const animate = () => {
      setPosition(prev => {
        const dx = targetPosition.x - prev.x;
        const dy = targetPosition.y - prev.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1) return prev;
        
        const speed = isSitting ? 0.02 : state === 'wandering' ? 0.03 : 0.06;
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

  // Create sparkle particles
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
    
    setParticles(prev => [...prev.slice(-20), newSparkle]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newSparkle.id));
    }, 1000);
  }, []);

  // Mouse move handler - giữ khoảng cách an toàn
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled || isHidden || isSitting) return;
    
    const now = Date.now();
    lastMoveTime.current = now;
    
    // Tính hướng di chuyển để lật Angel
    const dx = e.clientX - lastMousePosition.current.x;
    if (Math.abs(dx) > 5) {
      setIsFlipped(dx < 0); // Lật khi di chuyển sang trái
    }
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
    
    // Tính vị trí với khoảng cách an toàn - Angel ở phía trên bên phải cursor
    const offsetX = Math.cos(OFFSET_ANGLE) * SAFE_DISTANCE;
    const offsetY = Math.sin(OFFSET_ANGLE) * SAFE_DISTANCE;
    
    // Điều chỉnh vị trí khi cursor ở gần cạnh màn hình
    let newX = e.clientX + (isFlipped ? -offsetX : offsetX);
    let newY = e.clientY - offsetY;
    
    // Giữ Angel trong màn hình
    newX = Math.max(ANGEL_SIZE / 2, Math.min(window.innerWidth - ANGEL_SIZE / 2, newX));
    newY = Math.max(ANGEL_SIZE / 2, Math.min(window.innerHeight - ANGEL_SIZE / 2, newY));
    
    setTargetPosition({ x: newX, y: newY });
    
    if (!isMoving) {
      setIsMoving(true);
      setState('following');
    }
    
    // Create sparkle trail
    if (Math.random() > 0.6) {
      createSparkle(position.x, position.y);
    }
    
    // Clear idle timer and set new one
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setIsMoving(false);
      if (!isSitting) {
        // Chuyển về hovering thay vì idle khi dừng di chuyển
        const randomHover = Math.random();
        if (randomHover < 0.25) {
          setState('hoveringSparkle');
          setTimeout(() => setState('idle'), 3000);
        } else if (randomHover < 0.5) {
          setHoveringVariant(Math.random() < 0.5 ? 0 : 1);
          setState('hovering');
          setTimeout(() => setState('idle'), 2000);
        } else {
          setState('idle');
        }
      }
    }, 200);
  }, [enabled, isHidden, isSitting, isMoving, isFlipped, createSparkle, position]);

  // Click handler - Angel gets excited
  const handleClick = useCallback(() => {
    if (!enabled || isHidden) return;
    
    // Ngẫu nhiên chọn hành động khi click - thêm actions mới
    const actions: AngelState[] = [
      'excited', 'dancing', 'spinning', 'special', 'danceJump', 'clapping',
      'happyJump', 'sendingHeart'
    ];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    
    if (randomAction === 'clapping') {
      setClappingVariant(Math.random() < 0.5 ? 0 : 1);
    }
    if (randomAction === 'danceJump') {
      setDanceJumpVariant(Math.random() < 0.5 ? 0 : 1);
    }
    
    setState(randomAction);
    
    if (randomAction === 'spinning') {
      setIsSpinning(true);
    }
    
    // Burst of sparkles
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        createSparkle(position.x, position.y);
      }, i * 40);
    }
    
    setTimeout(() => {
      if (!isMoving) setState('idle');
      setIsSpinning(false);
    }, 2500);
  }, [enabled, isHidden, isMoving, position, createSparkle]);

  // Detect perch spots (ranking boards, logo)
  const checkPerchSpots = useCallback(() => {
    if (!enabled || isHidden || isMoving) return;
    
    const perchElements = document.querySelectorAll('[data-angel-perch]');
    
    perchElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const distance = Math.sqrt(
        Math.pow(position.x - (rect.left + rect.width / 2), 2) +
        Math.pow(position.y - rect.top, 2)
      );
      
      if (distance < 150 && Math.random() < 0.02) {
        setIsSitting(true);
        setState('sitting');
        setTargetPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 40,
        });
        
        setTimeout(() => {
          setIsSitting(false);
          setState('idle');
        }, 5000 + Math.random() * 5000);
      }
    });
  }, [enabled, isHidden, isMoving, position]);

  // Wandering - bay ngẫu nhiên trên màn hình
  const startWandering = useCallback(() => {
    if (!enabled || isMoving || isSitting || isHidden) return;
    
    // Chọn vị trí ngẫu nhiên trên màn hình
    const padding = ANGEL_SIZE;
    const newX = padding + Math.random() * (window.innerWidth - padding * 2);
    const newY = padding + Math.random() * (window.innerHeight - padding * 2);
    
    // Lật Angel theo hướng bay
    setIsFlipped(newX < position.x);
    
    setState('wandering');
    setTargetPosition({ x: newX, y: newY });
    
    // Sau khi đến nơi, chuyển về idle hoặc làm hành động khác
    setTimeout(() => {
      const afterActions: AngelState[] = ['dancing', 'danceJump', 'clapping', 'hoveringSparkle', 'happyJump', 'waving', 'idle'];
      const randomAfter = afterActions[Math.floor(Math.random() * afterActions.length)];
      setState(randomAfter);
      if (randomAfter !== 'idle') {
        setTimeout(() => setState('idle'), 3000);
      }
    }, 4000);
  }, [enabled, isMoving, isSitting, isHidden, position.x]);

  // Random behavior when idle
  useEffect(() => {
    if (!enabled || state !== 'idle' || isMoving || !hasGreeted) return;
    
    behaviorTimer.current = setInterval(() => {
      const random = Math.random();
      let cumulative = 0;
      
      for (const behavior of RANDOM_BEHAVIORS) {
        cumulative += behavior.chance;
        if (random < cumulative) {
          if (behavior.action === 'wandering') {
            startWandering();
          } else if (behavior.action === 'spinning') {
            setState('spinning');
            setIsSpinning(true);
          } else if (behavior.action === 'hiding') {
            setState(behavior.action);
            setIsHidden(true);
            setTimeout(() => {
              setIsHidden(false);
              setState('appearing');
            }, behavior.duration);
          } else if (behavior.action === 'sleeping') {
            setState(behavior.action);
            setTimeout(() => {
              setState('waking');
            }, behavior.duration);
          } else if (behavior.action === 'clapping') {
            setClappingVariant(Math.random() < 0.5 ? 0 : 1);
            setState(behavior.action);
            setTimeout(() => setState('idle'), behavior.duration);
          } else if (behavior.action === 'hovering') {
            setHoveringVariant(Math.random() < 0.5 ? 0 : 1);
            setState(behavior.action);
            setTimeout(() => setState('idle'), behavior.duration);
          } else if (behavior.action === 'danceJump') {
            setDanceJumpVariant(Math.random() < 0.5 ? 0 : 1);
            setState(behavior.action);
            setTimeout(() => setState('idle'), behavior.duration);
          } else {
            setState(behavior.action);
            setTimeout(() => setState('idle'), behavior.duration);
          }
          break;
        }
      }
      
      // Check for perch spots
      checkPerchSpots();
    }, 6000);
    
    return () => {
      if (behaviorTimer.current) clearInterval(behaviorTimer.current);
    };
  }, [enabled, state, isMoving, checkPerchSpots, startWandering, hasGreeted]);

  // Event listeners
  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
    };
  }, [enabled, handleMouseMove, handleClick]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (wanderTimer.current) clearTimeout(wanderTimer.current);
    };
  }, []);

  if (!enabled) return null;

  // Chọn GIF phù hợp dựa trên state và direction
  const getCurrentGif = () => {
    // Sử dụng GIF bay theo hướng khi following hoặc wandering
    if (state === 'following' || state === 'wandering') {
      return isFlipped ? FLYING_GIFS.left : FLYING_GIFS.right;
    }
    // Sử dụng variant cho clapping
    if (state === 'clapping') {
      return CLAPPING_GIFS[clappingVariant];
    }
    // Sử dụng variant cho hovering
    if (state === 'hovering') {
      return HOVERING_GIFS[hoveringVariant];
    }
    // Sử dụng variant cho danceJump
    if (state === 'danceJump') {
      return DANCE_JUMP_GIFS[danceJumpVariant];
    }
    return STATE_GIFS[state];
  };

  const currentGif = getCurrentGif();
  const halfSize = ANGEL_SIZE / 2;

  // Kết hợp các filter: glow + brightness
  const brightnessFilter = BRIGHTNESS_LEVELS[brightness] || BRIGHTNESS_LEVELS[3];
  const combinedFilter = [DEFAULT_GLOW, brightnessFilter].filter(Boolean).join(' ');

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999]">
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
      
      {/* Angel GIF - với skin và brightness filters */}
      <div
        className={`absolute transition-all duration-300 ${isHidden ? 'opacity-0 scale-0' : 'opacity-100'}`}
        style={{
          left: position.x - halfSize,
          top: position.y - halfSize - 20,
          width: ANGEL_SIZE,
          height: 'auto',
          filter: combinedFilter,
          transform: `${isFlipped && state !== 'following' && state !== 'wandering' ? 'scaleX(-1)' : 'scaleX(1)'} ${isSpinning ? 'rotate(360deg)' : 'rotate(0deg)'}`,
          transition: isSpinning ? 'transform 0.8s ease-in-out' : 'transform 0.2s ease-out',
        }}
      >
        <img
          key={currentGif}
          src={currentGif}
          alt="Angel Companion"
          className="w-full h-auto"
          style={{ transformOrigin: 'center center' }}
          draggable={false}
        />
        
        {/* Sleeping Z's */}
        {state === 'sleeping' && (
          <div className="absolute -top-4 right-0" style={{ transform: isFlipped ? 'scaleX(-1)' : 'none' }}>
            <span className="text-2xl animate-zzz-float text-blue-300" style={{ textShadow: '0 0 10px rgba(147, 197, 253, 0.8)' }}>
              💤
            </span>
          </div>
        )}
        
        {/* Excitement stars */}
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
        {(state === 'flying' || state === 'wandering' || state === 'following') && (
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
          <>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl animate-bounce">🌟</span>
          </>
        )}
        
        {/* Spinning effect */}
        {isSpinning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl animate-spin">🌟</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AngelCompanion;
