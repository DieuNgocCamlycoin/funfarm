import React, { useState, useEffect, useRef } from 'react';
import angelIdle from '@/assets/angel-gifs/angel-idle.gif';
import { useAngel } from './AngelContext';

const BUTTON_SIZE = 56;
const EDGE_PADDING = 16;

const AngelChatButton: React.FC = () => {
  const { isChatOpen, setIsChatOpen } = useAngel();
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Position state with localStorage initialization
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('angel-button-position');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Initialize position after mount (need window dimensions)
  useEffect(() => {
    if (position === null) {
      setPosition({
        x: window.innerWidth - BUTTON_SIZE - EDGE_PADDING,
        y: window.innerHeight - 160
      });
    }
  }, [position]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        if (!prev) return prev;
        return {
          x: Math.min(prev.x, window.innerWidth - BUTTON_SIZE - EDGE_PADDING),
          y: Math.min(prev.y, window.innerHeight - BUTTON_SIZE - EDGE_PADDING)
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const snapToEdge = (currentX: number, currentY: number) => {
    const centerX = currentX + BUTTON_SIZE / 2;
    const screenWidth = window.innerWidth;
    
    // Snap to nearest edge
    const newX = centerX < screenWidth / 2 
      ? EDGE_PADDING 
      : screenWidth - BUTTON_SIZE - EDGE_PADDING;
    
    // Keep Y within bounds
    const newY = Math.max(
      EDGE_PADDING,
      Math.min(currentY, window.innerHeight - BUTTON_SIZE - EDGE_PADDING)
    );
    
    const finalPosition = { x: newX, y: newY };
    setPosition(finalPosition);
    localStorage.setItem('angel-button-position', JSON.stringify(finalPosition));
  };

  const handleStart = (clientX: number, clientY: number) => {
    if (!position) return;
    setIsDragging(true);
    setHasMoved(false);
    dragOffset.current = {
      x: clientX - position.x,
      y: clientY - position.y
    };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setHasMoved(true);
    
    const newX = Math.max(0, Math.min(clientX - dragOffset.current.x, window.innerWidth - BUTTON_SIZE));
    const newY = Math.max(0, Math.min(clientY - dragOffset.current.y, window.innerHeight - BUTTON_SIZE));
    
    setPosition({ x: newX, y: newY });
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (!hasMoved) {
      // Short tap → toggle chat
      setIsChatOpen(!isChatOpen);
    } else if (position) {
      // Moved → snap to edge
      snapToEdge(position.x, position.y);
    }
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, hasMoved, position, isChatOpen]);

  if (!position) return null;

  return (
    <button
      ref={buttonRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      className={`
        fixed z-[99998]
        w-14 h-14 rounded-full
        bg-gradient-to-br from-pink-400/90 via-purple-400/90 to-cyan-400/90
        backdrop-blur-sm
        flex items-center justify-center
        shadow-lg shadow-purple-500/30
        hover:shadow-xl hover:shadow-purple-500/40
        ${isChatOpen ? 'scale-95 opacity-70' : ''}
        ${isDragging ? 'scale-110' : 'hover:scale-110'}
        select-none touch-none
      `}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'transform 0.1s' : 'left 0.3s ease, top 0.3s ease, transform 0.3s',
        animation: isChatOpen || isDragging ? 'none' : 'angelPulse 2s ease-in-out infinite',
      }}
    >
      <img 
        src={angelIdle} 
        alt="Chat with Angel" 
        className="w-10 h-10 object-contain drop-shadow-lg pointer-events-none"
        draggable={false}
      />
      
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400 opacity-50 blur-md -z-10 pointer-events-none"
        style={{ animation: isDragging ? 'none' : 'angelGlow 3s ease-in-out infinite' }}
      />

      <style>{`
        @keyframes angelPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes angelGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `}</style>
    </button>
  );
};

export default AngelChatButton;
