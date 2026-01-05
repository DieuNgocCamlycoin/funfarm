// 🧚 Angel Context - Quản lý trạng thái Angel Companion
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AngelCompanion from './AngelCompanion';
import AngelChat from './AngelChat';
import AngelChatButton from './AngelChatButton';
import { Slider } from '@/components/ui/slider';

interface AngelContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  brightness: number;
  setBrightness: (level: number) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
}

const AngelContext = createContext<AngelContextType | undefined>(undefined);

export const useAngel = () => {
  const context = useContext(AngelContext);
  if (!context) {
    throw new Error('useAngel must be used within AngelProvider');
  }
  return context;
};

interface AngelProviderProps {
  children: ReactNode;
  defaultEnabled?: boolean;
}

export const AngelProvider: React.FC<AngelProviderProps> = ({
  children,
  defaultEnabled = true,
}) => {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [brightness, setBrightness] = useState<number>(() => {
    return parseInt(localStorage.getItem('angel-brightness') || '3');
  });

  // Persist brightness to localStorage
  useEffect(() => {
    localStorage.setItem('angel-brightness', brightness.toString());
  }, [brightness]);

  return (
    <AngelContext.Provider value={{ enabled, setEnabled, brightness, setBrightness, isChatOpen, setIsChatOpen }}>
      {children}
      <AngelCompanion enabled={enabled} brightness={brightness} />
      <AngelChatButton />
      <AngelChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </AngelContext.Provider>
  );
};

// Settings panel component - Chỉ còn brightness
export const AngelSettings: React.FC = () => {
  const { enabled, setEnabled, brightness, setBrightness } = useAngel();

  return (
    <div className="fixed bottom-4 right-4 z-[99998] bg-background/95 backdrop-blur-md border border-border rounded-2xl p-5 shadow-2xl min-w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-base font-semibold flex items-center gap-2">
          🧚 Angel Companion
        </span>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            enabled 
              ? 'bg-primary text-primary-foreground shadow-lg' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>
      
      {enabled && (
        <div>
          <p className="text-sm font-medium mb-2 text-muted-foreground flex items-center justify-between">
            <span>☀️ Độ sáng da:</span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{brightness}/6</span>
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">🌑</span>
            <Slider
              value={[brightness]}
              onValueChange={(value) => setBrightness(value[0])}
              min={1}
              max={6}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground">☀️</span>
          </div>
          <p className="text-xs text-center mt-1 text-muted-foreground">
            {brightness <= 2 ? 'Tối' : brightness <= 4 ? 'Bình thường' : 'Trắng sáng'}
          </p>
        </div>
      )}
    </div>
  );
};
