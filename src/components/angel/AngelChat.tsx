import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAngel } from './AngelContext';
import angelIdle from '@/assets/angel-gifs/angel-idle.gif';
import angelExcited from '@/assets/angel-gifs/angel-excited.gif';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AngelChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/angel-chat`;

const WELCOME_MESSAGE: Message = { 
  role: 'assistant', 
  content: 'Xin chào! Mình là Angel 🧚 Bạn cần mình giúp gì nào? ✨' 
};

const AngelChat: React.FC<AngelChatProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { enabled, setEnabled, brightness, setBrightness } = useAngel();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const hasLoadedHistory = useRef(false);

  // Load chat history from database
  const loadChatHistory = useCallback(async () => {
    if (!user?.id || hasLoadedHistory.current) return;
    
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('angel_chat_messages')
        .select('id, role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        setMessages([WELCOME_MESSAGE, ...data.map(m => ({ 
          id: m.id, 
          role: m.role as 'user' | 'assistant', 
          content: m.content 
        }))]);
      }
      hasLoadedHistory.current = true;
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  // Save message to database
  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user?.id) return;
    
    try {
      await supabase.from('angel_chat_messages').insert({
        user_id: user.id,
        role,
        content,
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  // Clear chat history
  const clearHistory = async () => {
    if (!user?.id) return;
    
    try {
      await supabase
        .from('angel_chat_messages')
        .delete()
        .eq('user_id', user.id);
      
      setMessages([WELCOME_MESSAGE]);
      hasLoadedHistory.current = false;
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen, loadChatHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Save user message to database
    saveMessage('user', userMessage.content);

    let assistantContent = '';

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage].filter(m => m.role !== 'assistant' || m.content !== WELCOME_MESSAGE.content || messages.indexOf(m) !== 0) }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (newMessages[lastIndex]?.role === 'assistant') {
                  newMessages[lastIndex] = { ...newMessages[lastIndex], content: assistantContent };
                }
                return newMessages;
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Save assistant response to database
      if (assistantContent) {
        saveMessage('assistant', assistantContent);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = 'Ối! Angel gặp lỗi rồi 😢 Thử lại sau nhé!';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
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

  return (
    <div className="fixed bottom-24 right-4 z-[99999] w-[360px] max-w-[calc(100vw-32px)] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 p-4 flex items-center justify-between border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={isLoading ? angelExcited : angelIdle} 
                alt="Angel" 
                className="w-10 h-10 object-contain"
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            </div>
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-1">
                Angel <Sparkles className="w-3 h-3 text-yellow-500" />
              </h3>
              <p className="text-xs text-muted-foreground">Fun Farm Ecosystem</p>
            </div>
          </div>
          <div className="flex items-center gap-1 relative">
            {user && messages.length > 1 && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={clearHistory}
                className="h-8 w-8 rounded-full hover:bg-destructive/10"
                title="Xóa lịch sử chat"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8 rounded-full hover:bg-muted"
              title="Cài đặt Angel"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-destructive/10"
            >
              <X className="w-4 h-4" />
            </Button>
            
            {/* Settings Popup */}
            {showSettings && (
              <div 
                ref={settingsRef}
                className="absolute top-full right-0 mt-2 bg-background/95 backdrop-blur-xl border border-border rounded-xl p-4 shadow-xl min-w-[220px] z-10"
              >
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  🧚 Angel Settings
                </h4>
                
                {/* Toggle Companion */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm">✨ Companion</span>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>
                
                {/* Brightness Slider */}
                {enabled && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">☀️ Độ sáng</span>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{brightness}/6</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">🌑</span>
                      <Slider 
                        value={[brightness]} 
                        onValueChange={(v) => setBrightness(v[0])} 
                        min={1} 
                        max={6} 
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs">☀️</span>
                    </div>
                    <p className="text-xs text-center mt-1 text-muted-foreground">
                      {brightness <= 2 ? 'Tối' : brightness <= 4 ? 'Bình thường' : 'Trắng sáng'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="h-[320px] p-4" ref={scrollRef}>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {msg.role === 'assistant' && (
                    <img 
                      src={angelIdle} 
                      alt="Angel" 
                      className="w-8 h-8 object-contain flex-shrink-0"
                    />
                  )}
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    {msg.content || (isLoading && idx === messages.length - 1 ? (
                      <span className="flex gap-1">
                        <span className="animate-bounce">.</span>
                        <span className="animate-bounce delay-100">.</span>
                        <span className="animate-bounce delay-200">.</span>
                      </span>
                    ) : '')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t border-border/50 bg-muted/30">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={user ? "Nhắn tin cho Angel..." : "Đăng nhập để chat với Angel..."}
              className="flex-1 bg-background/80 border-border/50 rounded-full text-sm"
              disabled={isLoading || !user}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || !user}
              size="icon"
              className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AngelChat;
