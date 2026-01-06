// 🧚 Angel Chat Button - Draggable with Speed Dial Menu
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAngel } from './AngelContext';
import { MessageCircle, Edit, X } from 'lucide-react';
import angelIdleGif from '@/assets/angel-gifs/angel-idle.gif';

const BUTTON_SIZE = 56;
const EDGE_MARGIN = 12;

const AngelChatButton: React.FC = () => {
  const { isChatOpen, setIsChatOpen, onCreatePost } = useAngel();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Position state - initialized from localStorage
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const saved = localStorage.getItem('angel-button-position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate position is within bounds
        const maxX = window.innerWidth - BUTTON_SIZE - EDGE_MARGIN;
        const maxY = window.innerHeight - BUTTON_SIZE - EDGE_MARGIN;
        return {
          x: Math.min(Math.max(EDGE_MARGIN, parsed.x), maxX),
          y: Math.min(Math.max(EDGE_MARGIN, parsed.y), maxY)
        };
      } catch { /* ignore */ }
    }
    return { x: window.innerWidth - BUTTON_SIZE - EDGE_MARGIN, y: window.innerHeight - 160 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Snap to nearest edge
  const snapToEdge = useCallback((currentPos: { x: number; y: number }) => {
    const screenWidth = window.innerWidth;
    const centerX = currentPos.x + BUTTON_SIZE / 2;
    
    const newX = centerX < screenWidth / 2 
      ? EDGE_MARGIN 
      : screenWidth - BUTTON_SIZE - EDGE_MARGIN;
    
    // Keep Y within bounds
    const maxY = window.innerHeight - BUTTON_SIZE - EDGE_MARGIN;
    const newY = Math.min(Math.max(EDGE_MARGIN, currentPos.y), maxY);
    
    const finalPosition = { x: newX, y: newY };
    setPosition(finalPosition);
    localStorage.setItem('angel-button-position', JSON.stringify(finalPosition));
  }, []);

  // Handle drag start
  const handleStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    setHasMoved(false);
    dragOffset.current = {
      x: clientX - position.x,
      y: clientY - position.y
    };
  }, [position]);

  // Handle drag move
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    const newX = clientX - dragOffset.current.x;
    const newY = clientY - dragOffset.current.y;
    
    // Check if moved significantly
    const dx = Math.abs(newX - position.x);
    const dy = Math.abs(newY - position.y);
    if (dx > 5 || dy > 5) {
      setHasMoved(true);
      setIsMenuOpen(false); // Close menu while dragging
    }
    
    // Constrain to screen bounds
    const maxX = window.innerWidth - BUTTON_SIZE;
    const maxY = window.innerHeight - BUTTON_SIZE;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, position]);

  // Handle drag end
  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (!hasMoved) {
      // Tap - toggle menu
      setIsMenuOpen(prev => !prev);
    } else {
      // Dragged - snap to edge
      snapToEdge(position);
    }
  }, [isDragging, hasMoved, position, snapToEdge]);

  // Touch event handlers
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

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  // Global mouse move/up listeners
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const maxX = window.innerWidth - BUTTON_SIZE - EDGE_MARGIN;
        const maxY = window.innerHeight - BUTTON_SIZE - EDGE_MARGIN;
        return {
          x: Math.min(prev.x, maxX),
          y: Math.min(prev.y, maxY)
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menu when chat opens
  useEffect(() => {
    if (isChatOpen) setIsMenuOpen(false);
  }, [isChatOpen]);

  // Speed dial actions
  const handleOpenChat = () => {
    setIsMenuOpen(false);
    setIsChatOpen(true);
  };

  const handleCreatePost = () => {
    setIsMenuOpen(false);
    if (onCreatePost) {
      onCreatePost();
    }
  };

  // Determine if button is on left or right side
  const isOnLeft = position.x < window.innerWidth / 2;

  return (
    <>
      {/* Speed Dial Menu */}
      {isMenuOpen && (
        <div
          className="fixed z-[99997] flex flex-col gap-2"
          style={{
            left: isOnLeft ? position.x + BUTTON_SIZE + 8 : 'auto',
            right: isOnLeft ? 'auto' : window.innerWidth - position.x + 8,
            top: position.y,
          }}
        >
          {/* Chat button */}
          <button
            onClick={handleOpenChat}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg flex items-center justify-center text-primary-foreground hover:scale-110 transition-all duration-200 animate-scale-in"
            style={{ animationDelay: '0ms' }}
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          {/* Create post button - only show when callback is registered */}
          {onCreatePost && (
            <button
              onClick={handleCreatePost}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-primary shadow-lg flex items-center justify-center text-primary-foreground hover:scale-110 transition-all duration-200 animate-scale-in"
              style={{ animationDelay: '50ms' }}
            >
              <Edit className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Backdrop when menu open */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-[99996]" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Main Angel Button */}
      <button
        ref={buttonRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        className="group select-none touch-none"
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          zIndex: 99998,
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isDragging ? 'none' : 'left 0.3s ease-out, top 0.3s ease-out',
          transform: isMenuOpen ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-full opacity-60 blur-md"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
            animation: isChatOpen ? 'none' : 'pulse 2s ease-in-out infinite',
          }}
        />

        {/* Button body */}
        <div 
          className="relative w-full h-full rounded-full overflow-hidden border-2 border-primary/50 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.9), hsl(var(--secondary) / 0.9))',
          }}
        >
          <img
            src={angelIdleGif}
            alt="Angel"
            className="w-full h-full object-cover"
            style={{
              filter: isDragging ? 'brightness(0.8)' : 'brightness(1)',
              transition: 'filter 0.2s',
            }}
            draggable={false}
          />

          {/* Menu indicator */}
          {isMenuOpen && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <X className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
      </button>
    </>
  );
};

export default AngelChatButton;
