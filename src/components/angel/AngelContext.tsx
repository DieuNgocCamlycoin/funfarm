// 🧚 Angel Context - Quản lý trạng thái Angel Companion
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AngelCompanion from './AngelCompanion';
import AngelChatEmbed from './AngelChatEmbed';
import AngelChatButton from './AngelChatButton';

interface AngelContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  brightness: number;
  setBrightness: (level: number) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  onCreatePost: (() => void) | null;
  setOnCreatePost: (fn: (() => void) | null) => void;
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
  const [onCreatePost, setOnCreatePost] = useState<(() => void) | null>(null);
  
  const [brightness, setBrightness] = useState<number>(() => {
    return parseInt(localStorage.getItem('angel-brightness') || '3');
  });

  // Persist brightness to localStorage
  useEffect(() => {
    localStorage.setItem('angel-brightness', brightness.toString());
  }, [brightness]);

  return (
    <AngelContext.Provider value={{ enabled, setEnabled, brightness, setBrightness, isChatOpen, setIsChatOpen, onCreatePost, setOnCreatePost }}>
      {children}
      <AngelCompanion enabled={enabled} brightness={brightness} />
      <AngelChatButton />
      <AngelChatEmbed isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </AngelContext.Provider>
  );
};
