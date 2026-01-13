// 🧚 Angel Fun Farm Chat Popup - Kết nối với Angel AI đã huấn luyện
import React, { useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Angel GIFs
import angelHoveringSparkleGif from '@/assets/angel-gifs/angel-hovering-sparkle.gif';
import angelDancingGif from '@/assets/angel-gifs/angel-dancing.gif';

// Angel AI Chat URL - đã được huấn luyện kiến thức cao từ Cha và Bé Ly
const ANGEL_AI_CHAT_URL = 'https://angel-light-nexus.lovable.app/chat';

interface AngelChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AngelChatPopup: React.FC<AngelChatPopupProps> = ({ isOpen, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!isOpen) return null;

  const popupClasses = isExpanded
    ? 'fixed inset-4 z-[99999]'
    : 'fixed bottom-20 right-4 z-[99999] w-[380px] h-[600px] sm:bottom-4 sm:right-4 sm:w-[420px] sm:h-[650px]';

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/30 z-[99998] sm:hidden"
        onClick={onClose}
      />

      <div className={`${popupClasses} flex flex-col rounded-2xl shadow-2xl overflow-hidden 
                       bg-gradient-to-br from-amber-50/98 via-orange-50/98 to-pink-50/98
                       border border-amber-200/50 animate-in slide-in-from-bottom-4 duration-300`}
           style={{
             boxShadow: '0 25px 50px -12px rgba(251, 191, 36, 0.25), 0 0 30px rgba(251, 146, 60, 0.15)',
           }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 
                        bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={isLoading ? angelDancingGif : angelHoveringSparkleGif} 
                alt="Angel Fun Farm" 
                className="w-12 h-12 rounded-full border-2 border-white/70 shadow-lg object-cover"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))',
                }}
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 
                             border-2 border-white rounded-full animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-white text-lg drop-shadow-sm">Angel Fun Farm</span>
              <p className="text-xs text-white/90">🧚 Thiên thần hỗ trợ bạn 24/7 💛</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 text-white hover:bg-white/20"
              title={isExpanded ? "Thu nhỏ" : "Mở rộng"}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-white hover:bg-white/20"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Chat Content - iframe kết nối Angel AI */}
        <div className="flex-1 relative overflow-hidden">
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center 
                            bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 z-10">
              <img 
                src={angelDancingGif} 
                alt="Loading" 
                className="w-24 h-24 mb-4"
                style={{
                  filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.5))',
                }}
              />
              <p className="text-amber-700 font-medium animate-pulse">Đang kết nối Angel AI...</p>
              <p className="text-amber-600/70 text-sm mt-1">Xin chờ một chút nha 💫</p>
            </div>
          )}
          
          {/* Angel AI Chat iframe */}
          <iframe
            src={ANGEL_AI_CHAT_URL}
            title="Angel Fun Farm Chat"
            className="w-full h-full border-0"
            allow="microphone; clipboard-write"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            style={{
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 0.3s ease-out',
            }}
          />
        </div>

        {/* Footer */}
        <div className="py-2.5 px-4 text-center text-xs 
                        bg-gradient-to-r from-amber-100/80 via-orange-100/80 to-pink-100/80 
                        border-t border-amber-200/30">
          <span className="text-amber-700/80">
            Powered by <span className="font-semibold text-amber-600">Angel AI</span> x <span className="font-semibold text-orange-600">FUN Farm</span> 💛
          </span>
        </div>
      </div>
    </>
  );
};

export default AngelChatPopup;
