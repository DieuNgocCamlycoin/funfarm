import React, { createContext, useContext, useState, ReactNode } from 'react';
import FairyCursor, { FairyVariant, FAIRY_VARIANTS } from './FairyCursor';

interface FairyCursorContextType {
  variant: FairyVariant;
  setVariant: (variant: FairyVariant) => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const FairyCursorContext = createContext<FairyCursorContextType | undefined>(undefined);

export const useFairyCursor = () => {
  const context = useContext(FairyCursorContext);
  if (!context) {
    throw new Error('useFairyCursor must be used within FairyCursorProvider');
  }
  return context;
};

interface FairyCursorProviderProps {
  children: ReactNode;
  defaultVariant?: FairyVariant;
  defaultEnabled?: boolean;
}

export const FairyCursorProvider: React.FC<FairyCursorProviderProps> = ({
  children,
  defaultVariant = 'blue',
  defaultEnabled = true,
}) => {
  const [variant, setVariant] = useState<FairyVariant>(defaultVariant);
  const [enabled, setEnabled] = useState(defaultEnabled);

  return (
    <FairyCursorContext.Provider value={{ variant, setVariant, enabled, setEnabled }}>
      {children}
      <FairyCursor variant={variant} enabled={enabled} />
    </FairyCursorContext.Provider>
  );
};

// Settings panel component
export const FairyCursorSettings: React.FC = () => {
  const { variant, setVariant, enabled, setEnabled } = useFairyCursor();

  return (
    <div className="fixed bottom-4 right-4 z-[99998] bg-background/90 backdrop-blur-md border border-border rounded-xl p-4 shadow-xl">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-medium">🧚 Fairy Cursor</span>
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
      
      {enabled && (
        <div className="flex gap-2">
          {(Object.keys(FAIRY_VARIANTS) as FairyVariant[]).map((v) => (
            <button
              key={v}
              onClick={() => setVariant(v)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                variant === v ? 'border-primary scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: FAIRY_VARIANTS[v].dress }}
              title={v.charAt(0).toUpperCase() + v.slice(1)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export { FAIRY_VARIANTS };
export type { FairyVariant };
