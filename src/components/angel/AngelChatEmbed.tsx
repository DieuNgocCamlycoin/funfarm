// 🧚 Angel Chat Embed - Tích hợp Angel AI qua iframe
import React, { useState } from 'react';
import { X, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import angelIdleGif from '@/assets/angel-gifs/angel-idle.gif';

interface AngelChatEmbedProps {
  isOpen: boolean;
  onClose: () => void;
}

const ANGEL_AI_URL = 'https://angel-light-nexus.lovable.app/chat';

const AngelChatEmbed: React.FC<AngelChatEmbedProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleOpenExternal = () => {
    window.open(ANGEL_AI_URL, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-background/95 backdrop-blur-xl animate-in fade-in duration-300 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <img 
            src={angelIdleGif} 
            alt="Angel" 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
          />
          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Angel AI</h3>
            <p className="text-xs text-muted-foreground">Powered by Fun Ecosystem</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleOpenExternal}
            title="Mở trong tab mới"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background gap-4">
            <img 
              src={angelIdleGif} 
              alt="Loading..." 
              className="w-20 h-20 animate-pulse"
            />
            <p className="text-muted-foreground text-sm">Đang kết nối với Angel AI...</p>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background gap-4 p-4 text-center">
            <img 
              src={angelIdleGif} 
              alt="Error" 
              className="w-16 h-16 opacity-50"
            />
            <div>
              <p className="text-foreground font-medium mb-1">Không thể kết nối với Angel AI</p>
              <p className="text-muted-foreground text-sm mb-4">
                Vui lòng thử lại hoặc mở trong tab mới
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Thử lại
              </Button>
              <Button onClick={handleOpenExternal}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Mở tab mới
              </Button>
            </div>
          </div>
        )}

        {/* Iframe */}
        <iframe
          key={hasError ? 'retry' : 'initial'}
          src={ANGEL_AI_URL}
          className={`w-full h-full border-0 ${isLoading || hasError ? 'invisible' : 'visible'}`}
          title="Angel AI Chat"
          allow="microphone; camera; clipboard-write"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      </div>
    </div>
  );
};

export default AngelChatEmbed;
