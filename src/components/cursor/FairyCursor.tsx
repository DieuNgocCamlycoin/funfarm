import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useFairyCursor } from './FairyCursorContext';

// Fairy color variants
export const FAIRY_VARIANTS = {
  blue: { dress: '#a5d8ff', wings: '#74c0fc', skin: '#ffe8cc', hair: '#ffd43b' },
  pink: { dress: '#fcc2d7', wings: '#f783ac', skin: '#ffe8cc', hair: '#e599f7' },
  green: { dress: '#b2f2bb', wings: '#69db7c', skin: '#ffe8cc', hair: '#8ce99a' },
  gold: { dress: '#ffe066', wings: '#ffd43b', skin: '#ffe8cc', hair: '#fab005' },
  purple: { dress: '#d0bfff', wings: '#b197fc', skin: '#ffe8cc', hair: '#da77f2' },
} as const;

export type FairyVariant = keyof typeof FAIRY_VARIANTS;

interface Particle {
  id: number;
  x: number;
  y: number;
  opacity: number;
  scale: number;
  rotation: number;
}

interface FairyCursorProps {
  variant?: FairyVariant;
  enabled?: boolean;
}

const FairyCursor: React.FC<FairyCursorProps> = ({ variant = 'blue', enabled = true }) => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [targetPosition, setTargetPosition] = useState({ x: -100, y: -100 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [idleOffset, setIdleOffset] = useState({ x: 0, y: 0 });
  
  const particleIdRef = useRef(0);
  const lastMoveTime = useRef(Date.now());
  const animationRef = useRef<number>();
  const idleAnimationRef = useRef<number>();
  
  const colors = FAIRY_VARIANTS[variant];

  // Smooth position interpolation
  useEffect(() => {
    const animate = () => {
      setPosition(prev => ({
        x: prev.x + (targetPosition.x - prev.x) * 0.15,
        y: prev.y + (targetPosition.y - prev.y) * 0.15,
      }));
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [targetPosition]);

  // Idle floating animation
  useEffect(() => {
    if (!isIdle) {
      setIdleOffset({ x: 0, y: 0 });
      return;
    }

    let time = 0;
    const idleAnimate = () => {
      time += 0.02;
      setIdleOffset({
        x: Math.sin(time * 1.5) * 15,
        y: Math.sin(time * 2) * 10 + Math.cos(time) * 5,
      });
      idleAnimationRef.current = requestAnimationFrame(idleAnimate);
    };
    idleAnimationRef.current = requestAnimationFrame(idleAnimate);
    
    return () => {
      if (idleAnimationRef.current) cancelAnimationFrame(idleAnimationRef.current);
    };
  }, [isIdle]);

  // Mouse move handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setTargetPosition({ x: e.clientX, y: e.clientY });
    setIsMoving(true);
    setIsIdle(false);
    lastMoveTime.current = Date.now();

    // Create sparkle particles
    if (Math.random() > 0.6) {
      const newParticle: Particle = {
        id: particleIdRef.current++,
        x: e.clientX + (Math.random() - 0.5) * 20,
        y: e.clientY + (Math.random() - 0.5) * 20,
        opacity: 1,
        scale: 0.5 + Math.random() * 0.5,
        rotation: Math.random() * 45,
      };
      setParticles(prev => [...prev.slice(-15), newParticle]);
    }
  }, []);

  // Check for interactive elements
  const handleMouseOver = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive = target.matches('button, a, [role="button"], input, .clickable, [onclick]') ||
                          target.closest('button, a, [role="button"], input, .clickable');
    setIsHovering(!!isInteractive);
  }, []);

  // Idle detection
  useEffect(() => {
    const checkIdle = setInterval(() => {
      if (Date.now() - lastMoveTime.current > 3000) {
        setIsMoving(false);
        setIsIdle(true);
      }
    }, 500);
    return () => clearInterval(checkIdle);
  }, []);

  // Particle decay
  useEffect(() => {
    const decay = setInterval(() => {
      setParticles(prev => 
        prev
          .map(p => ({ ...p, opacity: p.opacity - 0.05, y: p.y + 0.5 }))
          .filter(p => p.opacity > 0)
      );
    }, 50);
    return () => clearInterval(decay);
  }, []);

  // Event listeners
  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseover', handleMouseOver);
    document.body.style.cursor = 'none';
    
    // Hide cursor on all elements
    const style = document.createElement('style');
    style.id = 'fairy-cursor-style';
    style.textContent = '*, *::before, *::after { cursor: none !important; }';
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      document.body.style.cursor = '';
      const existingStyle = document.getElementById('fairy-cursor-style');
      if (existingStyle) existingStyle.remove();
    };
  }, [enabled, handleMouseMove, handleMouseOver]);

  if (!enabled) return null;

  const wingSpeed = isHovering ? '0.15s' : isMoving ? '0.3s' : '0.5s';
  const fairyX = position.x + idleOffset.x;
  const fairyY = position.y + idleOffset.y;

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999]" aria-hidden="true">
      {/* Sparkle particles - 4-pointed stars */}
      {particles.map(particle => (
        <svg
          key={particle.id}
          className="absolute"
          style={{
            left: particle.x - 8,
            top: particle.y - 8,
            opacity: particle.opacity,
            transform: `scale(${particle.scale}) rotate(${particle.rotation}deg)`,
          }}
          width="16"
          height="16"
          viewBox="0 0 16 16"
        >
          <path
            d="M8 0 L9 7 L16 8 L9 9 L8 16 L7 9 L0 8 L7 7 Z"
            fill="url(#goldGradient)"
            filter="url(#glow)"
          />
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd700" />
              <stop offset="50%" stopColor="#fff9c4" />
              <stop offset="100%" stopColor="#ffd700" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        </svg>
      ))}

      {/* Fairy SVG */}
      <svg
        className="absolute transition-transform"
        style={{
          left: fairyX - 24,
          top: fairyY - 28,
          filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))',
          transform: isIdle ? 'rotate(-5deg)' : 'rotate(0deg)',
        }}
        width="48"
        height="56"
        viewBox="0 0 48 56"
      >
        <style>
          {`
            @keyframes flapLeft {
              0%, 100% { transform: rotate(-10deg) scaleX(1); }
              50% { transform: rotate(-30deg) scaleX(0.9); }
            }
            @keyframes flapRight {
              0%, 100% { transform: rotate(10deg) scaleX(1); }
              50% { transform: rotate(30deg) scaleX(0.9); }
            }
            .wing-left { 
              animation: flapLeft ${wingSpeed} ease-in-out infinite;
              transform-origin: 24px 22px;
            }
            .wing-right { 
              animation: flapRight ${wingSpeed} ease-in-out infinite;
              transform-origin: 24px 22px;
            }
            @keyframes bodyBob {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-2px); }
            }
            .fairy-body {
              animation: bodyBob 1s ease-in-out infinite;
            }
          `}
        </style>
        
        {/* Wing glow */}
        <defs>
          <radialGradient id="wingGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.wings} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.wings} stopOpacity="0.2" />
          </radialGradient>
          <linearGradient id="dressGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.dress} />
            <stop offset="100%" stopColor={colors.wings} stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Left Wing */}
        <ellipse
          className="wing-left"
          cx="14"
          cy="20"
          rx="12"
          ry="16"
          fill="url(#wingGlow)"
          stroke={colors.wings}
          strokeWidth="0.5"
          opacity="0.9"
        />
        
        {/* Right Wing */}
        <ellipse
          className="wing-right"
          cx="34"
          cy="20"
          rx="12"
          ry="16"
          fill="url(#wingGlow)"
          stroke={colors.wings}
          strokeWidth="0.5"
          opacity="0.9"
        />

        <g className="fairy-body">
          {/* Hair */}
          <ellipse cx="24" cy="18" rx="8" ry="9" fill={colors.hair} />
          <circle cx="20" cy="14" r="3" fill={colors.hair} />
          <circle cx="28" cy="14" r="3" fill={colors.hair} />
          
          {/* Face */}
          <circle cx="24" cy="20" r="6" fill={colors.skin} />
          
          {/* Eyes */}
          <ellipse cx="22" cy="19" rx="1" ry="1.5" fill="#4a4a4a" />
          <ellipse cx="26" cy="19" rx="1" ry="1.5" fill="#4a4a4a" />
          <circle cx="22.3" cy="18.5" r="0.4" fill="white" />
          <circle cx="26.3" cy="18.5" r="0.4" fill="white" />
          
          {/* Cheeks */}
          <circle cx="20" cy="21" r="1.2" fill="#ffb6c1" opacity="0.6" />
          <circle cx="28" cy="21" r="1.2" fill="#ffb6c1" opacity="0.6" />
          
          {/* Smile */}
          <path d="M22 23 Q24 25 26 23" stroke="#d4a88e" fill="none" strokeWidth="0.5" />
          
          {/* Body/Dress */}
          <path
            d="M20 26 Q18 32 16 42 Q24 46 32 42 Q30 32 28 26 Q24 28 20 26"
            fill="url(#dressGrad)"
          />
          
          {/* Arms */}
          <path d="M19 28 Q14 32 12 36" stroke={colors.skin} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M29 28 Q34 32 36 36" stroke={colors.skin} strokeWidth="2" fill="none" strokeLinecap="round" />
          
          {/* Legs */}
          <path d="M22 42 Q21 48 20 52" stroke={colors.skin} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M26 42 Q27 48 28 52" stroke={colors.skin} strokeWidth="2" fill="none" strokeLinecap="round" />
          
          {/* Crown/Tiara */}
          <path d="M20 12 L22 10 L24 13 L26 10 L28 12" stroke="#ffd700" strokeWidth="1" fill="none" />
          <circle cx="24" cy="11" r="1" fill="#ff69b4" />
        </g>
      </svg>
    </div>
  );
};

export default FairyCursor;
