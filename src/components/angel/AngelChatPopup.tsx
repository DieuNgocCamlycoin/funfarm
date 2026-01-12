// 🧚 Angel Fun Farm Chat Popup - Native chat với Angel Fun Farm
import React, { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Minimize2, Trash2, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
// Dùng GIF sinh động hơn cho avatar
import angelHoveringSparkleGif from '@/assets/angel-gifs/angel-hovering-sparkle.gif';
import angelDancingGif from '@/assets/angel-gifs/angel-dancing.gif';
import angelWavingGif from '@/assets/angel-gifs/angel-waving.gif';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AngelChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AngelChatPopup: React.FC<AngelChatPopupProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load chat history from localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('angel-chat-history');
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load chat history:', e);
        }
      }
    }
  }, [isOpen]);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('angel-chat-history', JSON.stringify(messages.slice(-50)));
    }
  }, [messages]);

  const handleClearHistory = () => {
    setMessages([]);
    localStorage.removeItem('angel-chat-history');
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/angel-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Có lỗi xảy ra');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let assistantContent = '';
      const decoder = new TextDecoder();

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg?.role === 'assistant') {
                    lastMsg.content = assistantContent;
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Angel chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: error instanceof Error 
            ? `😢 ${error.message}` 
            : '😢 Mình gặp lỗi rồi, thử lại sau nhé!',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  const popupClasses = isExpanded
    ? 'fixed inset-4 z-[99999]'
    : 'fixed bottom-20 right-4 z-[99999] w-[360px] h-[520px] sm:bottom-4 sm:right-4';

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/30 z-[99998] sm:hidden"
        onClick={onClose}
      />

      <div className={`${popupClasses} flex flex-col rounded-2xl shadow-2xl overflow-hidden 
                       bg-background border border-border animate-in slide-in-from-bottom-4 duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 
                        bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={isLoading ? angelDancingGif : angelHoveringSparkleGif} 
                alt="Angel Fun Farm" 
                className="w-12 h-12 rounded-full border-2 border-white/70 shadow-lg"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 
                             border-2 border-white rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-white text-lg">Angel Fun Farm</span>
                <Sparkles className="w-4 h-4 text-yellow-200" />
              </div>
              <span className="text-xs text-white/90">🧚 Thiên thần đồng hành cùng bạn</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearHistory}
              className="h-8 w-8 text-white hover:bg-white/20"
              title="Xóa lịch sử"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages Area - Background GIF của Angel */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 relative"
          style={{
            background: `linear-gradient(to bottom, rgba(255, 251, 235, 0.95), rgba(254, 243, 199, 0.9))`,
          }}
        >
          {/* Background Angel GIF - mờ nhẹ */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `url(${angelWavingGif})`,
              backgroundSize: '200px',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 relative z-10">
              <img 
                src={angelWavingGif} 
                alt="Angel Fun Farm" 
                className="w-28 h-28 mb-4"
              />
              <h3 className="font-semibold text-foreground mb-2">
                Xin chào! Mình là Angel Fun Farm 🧚
              </h3>
              <p className="text-sm text-muted-foreground">
                Mình có thể giúp bạn về Fun Farm, CAMLY Token, cách kiếm thưởng, 
                và nhiều thứ khác nữa! Hãy hỏi mình nhé! ✨
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex relative z-10 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <img 
                  src={angelHoveringSparkleGif} 
                  alt="Angel Fun Farm" 
                  className="w-9 h-9 rounded-full mr-2 flex-shrink-0 border border-amber-200"
                />
              )}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-orange-400 to-amber-400 text-white rounded-br-md'
                    : 'bg-white dark:bg-card shadow-sm border border-border/50 rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {msg.content || (isLoading && index === messages.length - 1 ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </span>
                  ) : '')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-3 bg-background border-t border-border">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhắn tin cho Angel..."
              disabled={isLoading}
              className="flex-1 rounded-full bg-muted/50 border-0 
                         focus-visible:ring-2 focus-visible:ring-purple-400"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 
                         hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="py-2 text-center text-xs text-muted-foreground 
                        bg-gradient-to-r from-purple-100/50 to-pink-100/50 
                        dark:from-purple-900/20 dark:to-pink-900/20">
          Powered by <span className="font-semibold text-amber-600">FUN Farm</span> 💛
        </div>
      </div>
    </>
  );
};

export default AngelChatPopup;
