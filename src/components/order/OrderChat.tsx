// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Send, Loader2, MessageCircle } from "lucide-react";

interface OrderMessage {
  id: string;
  order_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface OrderChatProps {
  orderId: string;
  buyerId: string;
  sellerId: string;
  buyerInfo?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  sellerInfo?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const OrderChat = ({ 
  orderId, 
  buyerId, 
  sellerId, 
  buyerInfo, 
  sellerInfo 
}: OrderChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('order_messages')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        // Map sender info
        const messagesWithSender = (data || []).map(msg => ({
          ...msg,
          sender: msg.sender_id === buyerId ? buyerInfo : sellerInfo
        }));
        
        setMessages(messagesWithSender);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [orderId, buyerId, sellerId, buyerInfo, sellerInfo]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`order-chat-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          const newMsg = payload.new as OrderMessage;
          // Add sender info
          newMsg.sender = newMsg.sender_id === buyerId ? buyerInfo : sellerInfo;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, buyerId, sellerId, buyerInfo, sellerInfo]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user?.id || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    try {
      const { error } = await supabase
        .from('order_messages')
        .insert({
          order_id: orderId,
          sender_id: user.id,
          content: messageContent
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isCurrentUser = (senderId: string) => senderId === user?.id;

  return (
    <div className="flex flex-col h-[300px] border rounded-lg bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
        <MessageCircle className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">Chat với {user?.id === buyerId ? 'người bán' : 'người mua'}</span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">
              Chưa có tin nhắn.<br />
              Hãy bắt đầu cuộc trò chuyện!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${isCurrentUser(msg.sender_id) ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarImage src={msg.sender?.avatar_url || ''} />
                  <AvatarFallback className="text-[10px]">
                    {msg.sender?.display_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 ${
                    isCurrentUser(msg.sender_id)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${
                    isCurrentUser(msg.sender_id) ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                      locale: vi
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t">
        <Input
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nhập tin nhắn..."
          className="flex-1"
          disabled={isSending}
        />
        <Button 
          size="icon" 
          onClick={handleSend}
          disabled={!newMessage.trim() || isSending}
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default OrderChat;
