import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Sparkles, 
  Loader2, 
  Image as ImageIcon,
  Heart,
  Gift,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import camlyCoinImg from '@/assets/camly_coin.png';

interface CreateGiftPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftData: {
    amount: number;
    currency: string;
    receiverId: string;
    receiverName: string;
    receiverAvatar: string | null;
    message: string;
  };
}

// Gift card templates
const giftTemplates = [
  {
    id: 'love',
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    emoji: '💝',
    title: 'Yêu thương',
  },
  {
    id: 'thanks',
    gradient: 'from-amber-400 via-orange-500 to-yellow-500',
    emoji: '🙏',
    title: 'Cảm ơn',
  },
  {
    id: 'congrats',
    gradient: 'from-green-400 via-emerald-500 to-teal-500',
    emoji: '🎉',
    title: 'Chúc mừng',
  },
  {
    id: 'support',
    gradient: 'from-blue-400 via-indigo-500 to-purple-500',
    emoji: '💪',
    title: 'Ủng hộ',
  },
];

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('vi-VN');
};

const CreateGiftPostModal: React.FC<CreateGiftPostModalProps> = ({
  isOpen,
  onClose,
  giftData,
}) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(giftTemplates[0]);
  const [customMessage, setCustomMessage] = useState(
    giftData.message || `Gửi tặng @${giftData.receiverName} với tất cả yêu thương! 💖`
  );
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!user) return;

    setIsPosting(true);
    try {
      // Create the post with gift info in hashtags
      const hashtags = ['#FunFarmGift', '#TặngQuà', `#${selectedTemplate.title}`];
      
      const postContent = `${selectedTemplate.emoji} ${customMessage}\n\n` +
        `🎁 Đã tặng ${formatNumber(giftData.amount)} ${giftData.currency} cho @${giftData.receiverName}\n\n` +
        `${hashtags.join(' ')}`;

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          content: postContent,
          post_type: 'gift',
          hashtags: hashtags,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for receiver
      await supabase.from('notifications').insert({
        user_id: giftData.receiverId,
        from_user_id: user.id,
        type: 'gift_post',
        post_id: post.id,
        content: `${profile?.display_name || 'Ai đó'} đã đăng bài chúc mừng tặng quà cho bạn!`,
      });

      toast.success('🎉 Đã đăng bài chúc mừng!');
      onClose();
      navigate('/feed');
    } catch (error) {
      console.error('Error creating gift post:', error);
      toast.error('Có lỗi xảy ra khi đăng bài');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Đăng bài chúc mừng
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Gift Card Preview */}
          <div 
            className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${selectedTemplate.gradient} p-6 text-white shadow-xl`}
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 left-4 text-6xl">{selectedTemplate.emoji}</div>
              <div className="absolute bottom-4 right-4 text-6xl">{selectedTemplate.emoji}</div>
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Gift className="w-6 h-6" />
                  <span className="font-bold text-lg">Fun Farm Gift</span>
                </div>
                <span className="text-4xl">{selectedTemplate.emoji}</span>
              </div>

              {/* Sender to Receiver */}
              <div className="flex items-center justify-center gap-4 my-6">
                <div className="flex flex-col items-center">
                  <Avatar className="w-14 h-14 border-2 border-white/50">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-white/20 text-white">
                      {profile?.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm mt-1 font-medium truncate max-w-[80px]">
                    {profile?.display_name || 'Bạn'}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex gap-1">
                    <Heart className="w-4 h-4 fill-white animate-pulse" />
                    <Heart className="w-5 h-5 fill-white animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <Heart className="w-4 h-4 fill-white animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                  <span className="text-xs opacity-80">tặng</span>
                </div>

                <div className="flex flex-col items-center">
                  <Avatar className="w-14 h-14 border-2 border-white/50">
                    <AvatarImage src={giftData.receiverAvatar || ''} />
                    <AvatarFallback className="bg-white/20 text-white">
                      {giftData.receiverName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm mt-1 font-medium truncate max-w-[80px]">
                    {giftData.receiverName}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="text-center bg-white/20 rounded-xl py-3 px-4 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-2">
                  <img src={camlyCoinImg} alt="coin" className="w-8 h-8" />
                  <span className="text-3xl font-bold">{formatNumber(giftData.amount)}</span>
                  <span className="text-lg">{giftData.currency}</span>
                </div>
              </div>

              {/* Message preview */}
              {giftData.message && (
                <div className="mt-4 text-center italic opacity-90 text-sm">
                  "{giftData.message}"
                </div>
              )}
            </div>
          </div>

          {/* Template Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Chọn kiểu thiệp</label>
            <div className="grid grid-cols-4 gap-2">
              {giftTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    selectedTemplate.id === template.id
                      ? 'border-primary bg-primary/10 scale-105'
                      : 'border-muted hover:border-muted-foreground'
                  }`}
                >
                  <span className="text-2xl">{template.emoji}</span>
                  <span className="text-xs font-medium">{template.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              Lời nhắn
            </label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Viết lời chúc của bạn..."
              rows={3}
              maxLength={500}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Sẽ tag @{giftData.receiverName} trong bài viết</span>
              <span>{customMessage.length}/500</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Bỏ qua
            </Button>
            <Button
              className="flex-1 gap-2 bg-gradient-to-r from-primary to-green-500"
              onClick={handlePost}
              disabled={isPosting}
            >
              {isPosting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Đăng bài
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGiftPostModal;
