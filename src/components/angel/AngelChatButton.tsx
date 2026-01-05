import React from 'react';
import angelIdle from '@/assets/angel-gifs/angel-idle.gif';
import { useAngel } from './AngelContext';

const AngelChatButton: React.FC = () => {
  const { isChatOpen, setIsChatOpen } = useAngel();

  return (
    <button
      onClick={() => setIsChatOpen(!isChatOpen)}
      className={`
        fixed bottom-20 right-4 z-[99998]
        w-14 h-14 rounded-full
        bg-gradient-to-br from-pink-400/90 via-purple-400/90 to-cyan-400/90
        backdrop-blur-sm
        flex items-center justify-center
        shadow-lg shadow-purple-500/30
        transition-all duration-300
        hover:scale-110 hover:shadow-xl hover:shadow-purple-500/40
        ${isChatOpen ? 'scale-95 opacity-70' : 'animate-pulse'}
      `}
      style={{
        animation: isChatOpen ? 'none' : 'angelPulse 2s ease-in-out infinite',
      }}
    >
      <img 
        src={angelIdle} 
        alt="Chat with Angel" 
        className="w-10 h-10 object-contain drop-shadow-lg"
      />
      
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400 opacity-50 blur-md -z-10"
        style={{ animation: 'angelGlow 3s ease-in-out infinite' }}
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
