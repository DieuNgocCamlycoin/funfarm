import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Gift, Sparkles, Check, X, Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import camlyCoinImg from '@/assets/camly_coin.png';

interface GiftApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftData: {
    postId: string;
    senderName: string;
    senderAvatar: string | null;
    amount: string;
    currency: string;
    message?: string;
  };
}

const GiftApprovalModal: React.FC<GiftApprovalModalProps> = ({
  isOpen,
  onClose,
  giftData,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleApproval = async (approved: boolean) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ receiver_approved: approved })
        .eq('id', giftData.postId);

      if (error) throw error;

      if (approved) {
        toast.success('🎉 Đã hiển thị món quà trên trang cá nhân của bạn!');
      } else {
        toast.info('Đã ẩn món quà khỏi trang cá nhân của bạn');
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating gift approval:', error);
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Gift className="w-6 h-6 text-primary" />
            <span>Bạn có món quà mới!</span>
            <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Gift preview card */}
          <div className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-2xl p-5 text-white overflow-hidden">
            {/* Sparkle particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-white/50 animate-pulse"
                  style={{
                    left: `${10 + (i % 5) * 20}%`,
                    top: `${10 + Math.floor(i / 5) * 30}%`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10">
              {/* From sender */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="w-12 h-12 border-2 border-white/50">
                  <AvatarImage src={giftData.senderAvatar || ''} />
                  <AvatarFallback className="bg-white/20 text-white">
                    {giftData.senderName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold">{giftData.senderName}</p>
                  <p className="text-sm opacity-90">đã tặng bạn</p>
                </div>
              </div>

              {/* Amount */}
              <div className="text-center bg-white/20 rounded-xl py-4 px-4 backdrop-blur-sm border border-white/30">
                <div className="flex items-center justify-center gap-3">
                  <img 
                    src={camlyCoinImg} 
                    alt="coin" 
                    className="w-10 h-10"
                    style={{ animation: 'spin 3s linear infinite' }}
                  />
                  <span className="text-3xl font-black">{giftData.amount}</span>
                  <span className="text-xl font-semibold">{giftData.currency}</span>
                </div>
              </div>

              {/* Message */}
              {giftData.message && (
                <div className="mt-4 text-center italic text-sm opacity-90 bg-white/10 rounded-lg py-2 px-3">
                  "{giftData.message}"
                </div>
              )}
            </div>
          </div>

          {/* Question */}
          <div className="text-center py-2">
            <p className="text-lg font-semibold flex items-center justify-center gap-2">
              Bạn muốn khoe món quà này trên profile không?
              <span className="text-2xl">😍</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Mọi người sẽ thấy bạn được tặng quà!
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => handleApproval(false)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <X className="w-4 h-4" />
                  Không, giữ riêng tư
                </>
              )}
            </Button>
            <Button
              className="flex-1 gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
              onClick={() => handleApproval(true)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Heart className="w-4 h-4 fill-white" />
                  Có, khoe thôi!
                </>
              )}
            </Button>
          </div>

          {/* Note */}
          <p className="text-xs text-center text-muted-foreground">
            💡 Bạn có thể thay đổi quyết định này trong cài đặt bài viết bất cứ lúc nào
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GiftApprovalModal;
