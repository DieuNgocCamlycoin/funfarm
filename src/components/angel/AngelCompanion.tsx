// 🧚 FUN FARM Angel Companion - Thiên thần đồng hành dễ thương
import React, { useState, useEffect, useRef, useCallback } from 'react';
import angelRainbow from '@/assets/angel-rainbow.png';
import angelGreen from '@/assets/angel-green.png';
import angelBlue from '@/assets/angel-blue.png';

export type AngelState = 
  | 'idle'
  | 'following'
  | 'dancing'
  | 'sleeping'
  | 'waking'
  | 'sitting'
  | 'hiding'
  | 'appearing'
  | 'excited';

interface Sparkle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

// Map trạng thái với hình ảnh
const STATE_IMAGES: Record<AngelState, string> = {
  idle: angelGreen,
  following: angelGreen,
  dancing: angelRainbow,
  sleeping: angelBlue,
  waking: angelBlue,
  sitting: angelGreen,
  hiding: angelRainbow,
  appearing: angelRainbow,
  excited: angelRainbow,
};

// Animation classes cho từng trạng thái
const STATE_ANIMATIONS: Record<AngelState, string> = {
  idle: 'animate-angel-float',
  following: 'animate-angel-follow',
  dancing: 'animate-angel-dance',
  sleeping: 'animate-angel-sleep',
  waking: 'animate-angel-wake',
  sitting: 'animate-angel-sit',
  hiding: 'animate-angel-hide',
  appearing: 'animate-angel-appear',
  excited: 'animate-angel-excited',
};

// Random behaviors khi idle
const RANDOM_BEHAVIORS: { action: AngelState; chance: number; duration: number }[] = [
  { action: 'dancing', chance: 0.08, duration: 4000 },
  { action: 'sleeping', chance: 0.04, duration: 8000 },
  { action: 'hiding', chance: 0.05, duration: 5000 },
  { action: 'excited', chance: 0.06, duration: 2000 },
];

interface AngelCompanionProps {
  enabled?: boolean;
}

const AngelCompanion: React.FC<AngelCompanionProps> = ({ enabled = true }) => {
  const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [targetPosition, setTargetPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [state, setState] = useState<AngelState>('idle');
  const [particles, setParticles] = useState<Sparkle[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  
  const lastMoveTime = useRef(Date.now());
  const idleTimer = useRef<NodeJS.Timeout>();
  const behaviorTimer = useRef<NodeJS.Timeout>();
  const frameRef = useRef<number>();

  // Smooth position interpolation
  useEffect(() => {
    if (!enabled) return;
    
    const animate = () => {
      setPosition(prev => {
        const dx = targetPosition.x - prev.x;
        const dy = targetPosition.y - prev.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1) return prev;
        
        const speed = isSitting ? 0.02 : 0.08;
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
  }, [targetPosition, enabled, isSitting]);

  // Create sparkle particles
  const createSparkle = useCallback((x: number, y: number) => {
    const colors = ['#ffd700', '#ff69b4', '#00ff88', '#87ceeb', '#ff6b6b'];
    const newSparkle: Sparkle = {
      id: Date.now() + Math.random(),
      x: x + (Math.random() - 0.5) * 60,
      y: y + (Math.random() - 0.5) * 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 12,
      rotation: Math.random() * 360,
    };
    
    setParticles(prev => [...prev.slice(-15), newSparkle]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newSparkle.id));
    }, 800);
  }, []);

  // Mouse move handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled || isHidden || isSitting) return;
    
    const now = Date.now();
    lastMoveTime.current = now;
    
    setTargetPosition({ x: e.clientX, y: e.clientY });
    
    if (!isMoving) {
      setIsMoving(true);
      setState('following');
    }
    
    // Create sparkle trail
    if (Math.random() > 0.7) {
      createSparkle(e.clientX, e.clientY);
    }
    
    // Clear idle timer and set new one
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setIsMoving(false);
      if (!isSitting) setState('idle');
    }, 150);
  }, [enabled, isHidden, isSitting, isMoving, createSparkle]);

  // Click handler - Angel gets excited
  const handleClick = useCallback(() => {
    if (!enabled || isHidden) return;
    
    setState('excited');
    
    // Burst of sparkles
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        createSparkle(position.x, position.y);
      }, i * 50);
    }
    
    setTimeout(() => {
      if (!isMoving) setState('idle');
    }, 1500);
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
          y: rect.top - 30,
        });
        
        setTimeout(() => {
          setIsSitting(false);
          setState('idle');
        }, 5000 + Math.random() * 5000);
      }
    });
  }, [enabled, isHidden, isMoving, position]);

  // Random behavior when idle
  useEffect(() => {
    if (!enabled || state !== 'idle' || isMoving) return;
    
    behaviorTimer.current = setInterval(() => {
      const random = Math.random();
      let cumulative = 0;
      
      for (const behavior of RANDOM_BEHAVIORS) {
        cumulative += behavior.chance;
        if (random < cumulative) {
          setState(behavior.action);
          
          if (behavior.action === 'hiding') {
            setIsHidden(true);
            setTimeout(() => {
              setIsHidden(false);
              setState('appearing');
              setTimeout(() => setState('idle'), 1000);
            }, behavior.duration);
          } else if (behavior.action === 'sleeping') {
            setTimeout(() => {
              setState('waking');
              setTimeout(() => setState('idle'), 1500);
            }, behavior.duration);
          } else {
            setTimeout(() => setState('idle'), behavior.duration);
          }
          break;
        }
      }
      
      // Check for perch spots
      checkPerchSpots();
    }, 8000);
    
    return () => {
      if (behaviorTimer.current) clearInterval(behaviorTimer.current);
    };
  }, [enabled, state, isMoving, checkPerchSpots]);

  // Event listeners
  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    
    // Hide default cursor
    document.body.style.cursor = 'none';
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.body.style.cursor = 'auto';
    };
  }, [enabled, handleMouseMove, handleClick]);

  if (!enabled) return null;

  const currentImage = STATE_IMAGES[state];
  const currentAnimation = STATE_ANIMATIONS[state];

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
            style={{ filter: `drop-shadow(0 0 4px ${particle.color})` }}
          />
        </svg>
      ))}
      
      {/* Angel image */}
      <div
        className={`absolute transition-opacity duration-300 ${isHidden ? 'opacity-0 scale-0' : 'opacity-100'}`}
        style={{
          left: position.x - 50,
          top: position.y - 70,
          width: 100,
          height: 'auto',
          filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.5)) drop-shadow(0 0 40px rgba(255, 182, 193, 0.3))',
        }}
      >
        <img
          src={currentImage}
          alt="Angel Companion"
          className={`w-full h-auto ${currentAnimation}`}
          style={{
            transformOrigin: 'center bottom',
          }}
          draggable={false}
        />
        
        {/* Sleeping Z's */}
        {state === 'sleeping' && (
          <div className="absolute -top-2 right-0">
            <span className="text-xl animate-zzz-float text-blue-300" style={{ textShadow: '0 0 8px rgba(147, 197, 253, 0.8)' }}>
              💤
            </span>
          </div>
        )}
        
        {/* Excitement stars */}
        {state === 'excited' && (
          <>
            <span className="absolute -top-2 -left-2 text-lg animate-bounce">✨</span>
            <span className="absolute -top-2 -right-2 text-lg animate-bounce" style={{ animationDelay: '0.1s' }}>✨</span>
          </>
        )}
        
        {/* Dancing music notes */}
        {state === 'dancing' && (
          <>
            <span className="absolute -top-4 left-0 text-lg animate-bounce">🎵</span>
            <span className="absolute -top-6 right-0 text-lg animate-bounce" style={{ animationDelay: '0.2s' }}>🎶</span>
          </>
        )}
      </div>
    </div>
  );
};

export default AngelCompanion;
