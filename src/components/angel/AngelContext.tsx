// 🧚 Angel Context - Quản lý trạng thái Angel Companion
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AngelCompanion from './AngelCompanion';
import { Slider } from '@/components/ui/slider';

export type AngelSkin = 'rainbow' | 'pink' | 'blue' | 'gold' | 'green' | 'purple';

interface AngelContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  skin: AngelSkin;
  setSkin: (skin: AngelSkin) => void;
  brightness: number;
  setBrightness: (level: number) => void;
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
  
  const [skin, setSkin] = useState<AngelSkin>(() => {
    return (localStorage.getItem('angel-skin') as AngelSkin) || 'rainbow';
  });
  
  const [brightness, setBrightness] = useState<number>(() => {
    return parseInt(localStorage.getItem('angel-brightness') || '3');
  });

  // Persist skin to localStorage
  useEffect(() => {
    localStorage.setItem('angel-skin', skin);
  }, [skin]);

  // Persist brightness to localStorage
  useEffect(() => {
    localStorage.setItem('angel-brightness', brightness.toString());
  }, [brightness]);

  return (
    <AngelContext.Provider value={{ enabled, setEnabled, skin, setSkin, brightness, setBrightness }}>
      {children}
      <AngelCompanion enabled={enabled} skin={skin} brightness={brightness} />
    </AngelContext.Provider>
  );
};

// Skin configuration với màu sắc và icon
const SKIN_OPTIONS: { id: AngelSkin; label: string; icon: string; color: string }[] = [
  { id: 'rainbow', label: 'Cầu vồng', icon: '🌈', color: 'bg-gradient-to-r from-pink-400 via-yellow-400 to-cyan-400' },
  { id: 'pink', label: 'Hồng', icon: '💗', color: 'bg-pink-400' },
  { id: 'blue', label: 'Xanh biển', icon: '💙', color: 'bg-sky-400' },
  { id: 'gold', label: 'Vàng kim', icon: '✨', color: 'bg-amber-400' },
  { id: 'green', label: 'Xanh lá', icon: '💚', color: 'bg-emerald-400' },
  { id: 'purple', label: 'Tím', icon: '💜', color: 'bg-purple-400' },
];

// Settings panel component - Enhanced với skin và brightness
export const AngelSettings: React.FC = () => {
  const { enabled, setEnabled, skin, setSkin, brightness, setBrightness } = useAngel();

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
        <>
          {/* Skin Selection */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2 text-muted-foreground">👗 Trang phục:</p>
            <div className="grid grid-cols-6 gap-2">
              {SKIN_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSkin(option.id)}
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${option.color} ${
                    skin === option.id 
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-lg' 
                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                  title={option.label}
                >
                  {option.icon}
                </button>
              ))}
            </div>
          </div>
          
          {/* Brightness Slider */}
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
        </>
      )}
    </div>
  );
};
