// 🧚 Angel Context - Quản lý trạng thái Angel Companion
import React, { createContext, useContext, useState, ReactNode } from 'react';
import AngelCompanion from './AngelCompanion';

interface AngelContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
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

  return (
    <AngelContext.Provider value={{ enabled, setEnabled }}>
      {children}
      <AngelCompanion enabled={enabled} />
    </AngelContext.Provider>
  );
};

// Settings panel component
export const AngelSettings: React.FC = () => {
  const { enabled, setEnabled } = useAngel();

  return (
    <div className="fixed bottom-4 right-4 z-[99998] bg-background/90 backdrop-blur-md border border-border rounded-xl p-4 shadow-xl">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">🧚 Angel Companion</span>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            enabled 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
};
