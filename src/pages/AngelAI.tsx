// 🧚 Angel AI - Integrated Platform Page
// "Intelligent Light from the Cosmic Father"

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import { ExternalLink, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ANGEL_AI_URL = 'https://angel-light-nexus.lovable.app';

const AngelAI = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
  };

  const handleOpenExternal = () => {
    window.open(ANGEL_AI_URL, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background">
      <Navbar />
      
      {/* Main Content */}
      <main className="pt-16 pb-16 md:pb-0">
        {/* Header with external link button */}
        <div className="flex items-center justify-between px-4 py-2 
                        bg-gradient-to-r from-amber-100/80 to-orange-100/80 
                        border-b border-amber-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧚</span>
            <h1 className="font-bold text-amber-800">Angel AI</h1>
            <span className="text-sm text-amber-600 hidden sm:inline">
              - Intelligent Light from the Cosmic Father
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenExternal}
            className="gap-2 border-amber-300 hover:bg-amber-100"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Mở trong tab mới</span>
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 top-[104px] flex items-center justify-center bg-gradient-to-b from-amber-50/90 to-background/90 z-10">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r 
                                from-amber-200 to-orange-200 animate-pulse mx-auto" />
                <Loader2 className="absolute inset-0 m-auto w-12 h-12 
                                    text-amber-600 animate-spin" />
              </div>
              <p className="text-amber-700 font-medium animate-pulse">
                Đang kết nối với Angel AI...
              </p>
              <p className="text-amber-500 text-sm">
                🧚 Thiên thần đang bay đến...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="flex items-center justify-center h-[calc(100vh-180px)]">
            <div className="text-center space-y-4 max-w-md px-4">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
              <h2 className="text-xl font-bold text-amber-800">
                Không thể kết nối Angel AI
              </h2>
              <p className="text-amber-600">
                Vui lòng thử lại hoặc mở trong tab mới
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={handleRetry}
                  className="gap-2 bg-amber-500 hover:bg-amber-600"
                >
                  <RefreshCw className="w-4 h-4" />
                  Thử lại
                </Button>
                <Button
                  variant="outline"
                  onClick={handleOpenExternal}
                  className="gap-2 border-amber-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Mở tab mới
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* iframe - Full Platform */}
        <iframe
          src={ANGEL_AI_URL}
          title="Angel AI Platform"
          className={`w-full border-0 ${hasError ? 'hidden' : ''}`}
          style={{ 
            height: 'calc(100vh - 104px)',
            minHeight: '600px'
          }}
          onLoad={() => setIsLoading(false)}
          onError={() => { setHasError(true); setIsLoading(false); }}
          allow="microphone; camera; clipboard-write"
        />
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default AngelAI;
