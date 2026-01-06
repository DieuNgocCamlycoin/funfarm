import React, { useState, useRef } from 'react';
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
  Send,
  Wallet,
  Music,
  Play,
  Pause
} from 'lucide-react';
import { toast } from 'sonner';
import camlyCoinImg from '@/assets/camly_coin.png';
import { giftSoundOptions } from '@/components/feed/GiftPostDisplay';

interface CreateGiftPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftData: {
    amount: number;
    currency: string;
    receiverId: string;
    receiverName: string;
    receiverAvatar: string | null;
    receiverWallet?: string;
    message: string;
  };
}

// 46 Gift card templates - Clean & Positive only
const giftTemplates = [
  // === LOVE & ROMANCE (5) ===
  { id: 'love', gradient: 'from-pink-500 via-rose-500 to-red-500', emoji: '💝', title: 'Yêu thương', effect: 'hearts', category: 'love' },
  { id: 'romance', gradient: 'from-rose-400 via-pink-500 to-fuchsia-500', emoji: '💕', title: 'Lãng mạn', effect: 'hearts', category: 'love' },
  { id: 'kiss', gradient: 'from-red-400 via-rose-500 to-pink-400', emoji: '💋', title: 'Thương yêu', effect: 'hearts', category: 'love' },
  { id: 'heart-fire', gradient: 'from-red-500 via-orange-500 to-yellow-400', emoji: '❤️‍🔥', title: 'Cháy bỏng', effect: 'hearts', category: 'love' },
  { id: 'couple', gradient: 'from-pink-400 via-purple-400 to-indigo-400', emoji: '💑', title: 'Đôi lứa', effect: 'hearts', category: 'love' },
  
  // === THANKS & APPRECIATION (3) ===
  { id: 'thanks', gradient: 'from-amber-400 via-orange-500 to-yellow-500', emoji: '🙏', title: 'Cảm ơn', effect: 'stars', category: 'thanks' },
  { id: 'appreciate', gradient: 'from-yellow-400 via-amber-500 to-orange-400', emoji: '🌟', title: 'Tri ân', effect: 'stars', category: 'thanks' },
  { id: 'blessing', gradient: 'from-sky-400 via-blue-500 to-indigo-500', emoji: '🤲', title: 'Phúc lành', effect: 'stars', category: 'thanks' },
  
  // === CELEBRATION (4) ===
  { id: 'congrats', gradient: 'from-green-400 via-emerald-500 to-teal-500', emoji: '🎉', title: 'Chúc mừng', effect: 'confetti', category: 'celebration' },
  { id: 'party', gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', emoji: '🎊', title: 'Tiệc tùng', effect: 'confetti', category: 'celebration' },
  { id: 'fireworks', gradient: 'from-indigo-500 via-purple-600 to-pink-500', emoji: '🎆', title: 'Pháo hoa', effect: 'sparkle', category: 'celebration' },
  { id: 'trophy', gradient: 'from-yellow-500 via-amber-400 to-orange-400', emoji: '🏆', title: 'Chiến thắng', effect: 'confetti', category: 'celebration' },
  
  // === NATURE & FARM (4) ===
  { id: 'farm', gradient: 'from-green-500 via-lime-500 to-emerald-400', emoji: '🌾', title: 'Nông trại', effect: 'leaves', category: 'nature' },
  { id: 'flower', gradient: 'from-pink-400 via-rose-400 to-red-300', emoji: '🌸', title: 'Hoa đẹp', effect: 'petals', category: 'nature' },
  { id: 'garden', gradient: 'from-emerald-400 via-green-500 to-teal-400', emoji: '🌻', title: 'Vườn xanh', effect: 'leaves', category: 'nature' },
  { id: 'rainbow', gradient: 'from-red-400 via-yellow-400 to-green-400', emoji: '🌈', title: 'Cầu vồng', effect: 'rainbow', category: 'nature' },

  // === TẾT / LUNAR NEW YEAR (6) ===
  { id: 'tet-lucky', gradient: 'from-red-600 via-red-500 to-orange-500', emoji: '🧧', title: 'Lì xì', effect: 'coins', category: 'tet' },
  { id: 'tet-lantern', gradient: 'from-red-500 via-orange-400 to-yellow-400', emoji: '🏮', title: 'Đèn lồng', effect: 'sparkle', category: 'tet' },
  { id: 'tet-dragon', gradient: 'from-red-600 via-orange-500 to-yellow-500', emoji: '🐉', title: 'Rồng vàng', effect: 'coins', category: 'tet' },
  { id: 'tet-banhchung', gradient: 'from-green-600 via-green-500 to-lime-400', emoji: '🍀', title: 'Bánh chưng', effect: 'leaves', category: 'tet' },
  { id: 'tet-peach', gradient: 'from-pink-500 via-rose-400 to-red-400', emoji: '🌺', title: 'Hoa đào', effect: 'petals', category: 'tet' },
  { id: 'tet-fireworks', gradient: 'from-red-500 via-yellow-500 to-orange-400', emoji: '🎇', title: 'Pháo Tết', effect: 'fireworks', category: 'tet' },

  // === BIRTHDAY (6) ===
  { id: 'birthday-cake', gradient: 'from-fuchsia-500 via-pink-500 to-rose-400', emoji: '🎂', title: 'Sinh nhật', effect: 'confetti', category: 'birthday' },
  { id: 'birthday-balloon', gradient: 'from-sky-400 via-blue-400 to-purple-500', emoji: '🎈', title: 'Bóng bay', effect: 'confetti', category: 'birthday' },
  { id: 'birthday-party', gradient: 'from-purple-500 via-pink-500 to-red-400', emoji: '🥳', title: 'Tiệc HBD', effect: 'confetti', category: 'birthday' },
  { id: 'birthday-candle', gradient: 'from-orange-400 via-yellow-400 to-amber-300', emoji: '🕯️', title: 'Nến sinh nhật', effect: 'sparkle', category: 'birthday' },
  { id: 'birthday-gift', gradient: 'from-purple-500 via-violet-500 to-indigo-500', emoji: '🎁', title: 'Quà sinh nhật', effect: 'sparkle', category: 'birthday' },
  { id: 'birthday-star', gradient: 'from-pink-400 via-fuchsia-400 to-purple-500', emoji: '🌟', title: 'Ngày đặc biệt', effect: 'stars', category: 'birthday' },

  // === VALENTINE (5) ===
  { id: 'valentine-heart', gradient: 'from-red-500 via-rose-500 to-pink-400', emoji: '❤️', title: 'Valentine', effect: 'hearts', category: 'valentine' },
  { id: 'valentine-rose', gradient: 'from-red-600 via-rose-500 to-red-400', emoji: '🌹', title: 'Hoa hồng', effect: 'petals', category: 'valentine' },
  { id: 'valentine-cupid', gradient: 'from-pink-400 via-rose-400 to-red-300', emoji: '💘', title: 'Cupid', effect: 'hearts', category: 'valentine' },
  { id: 'valentine-letter', gradient: 'from-red-400 via-pink-500 to-rose-400', emoji: '💌', title: 'Tình thư', effect: 'hearts', category: 'valentine' },
  { id: 'valentine-chocolate', gradient: 'from-amber-700 via-amber-600 to-orange-500', emoji: '🍫', title: 'Socola', effect: 'sparkle', category: 'valentine' },

  // === CRYPTO MEME (8) ===
  { id: 'crypto-doge', gradient: 'from-yellow-500 via-amber-400 to-orange-400', emoji: '🐕', title: 'Doge', effect: 'coins', category: 'crypto' },
  { id: 'crypto-pepe', gradient: 'from-green-500 via-lime-500 to-emerald-400', emoji: '🐸', title: 'Pepe', effect: 'coins', category: 'crypto' },
  { id: 'crypto-moon', gradient: 'from-indigo-600 via-purple-600 to-violet-500', emoji: '🌙', title: 'To the Moon', effect: 'sparkle', category: 'crypto' },
  { id: 'crypto-rocket', gradient: 'from-orange-500 via-red-500 to-purple-600', emoji: '🚀', title: 'Rocket', effect: 'fireworks', category: 'crypto' },
  { id: 'crypto-diamond-hands', gradient: 'from-cyan-400 via-blue-500 to-purple-500', emoji: '💎', title: 'Diamond Hands', effect: 'sparkle', category: 'crypto' },
  { id: 'crypto-whale', gradient: 'from-blue-600 via-cyan-500 to-teal-400', emoji: '🐋', title: 'Whale', effect: 'coins', category: 'crypto' },
  { id: 'crypto-bull', gradient: 'from-green-600 via-emerald-500 to-lime-400', emoji: '🐂', title: 'Bull Run', effect: 'coins', category: 'crypto' },
  { id: 'crypto-money', gradient: 'from-green-500 via-emerald-500 to-teal-400', emoji: '🤑', title: 'Rich Rich', effect: 'coins', category: 'crypto' },

  // === FUN & CUTE (5) ===
  { id: 'fun-cool', gradient: 'from-blue-500 via-cyan-500 to-teal-400', emoji: '😎', title: 'Cool ngầu', effect: 'sparkle', category: 'fun' },
  { id: 'fun-star', gradient: 'from-amber-300 via-yellow-400 to-orange-400', emoji: '⭐', title: 'Ngôi sao', effect: 'stars', category: 'fun' },
  { id: 'fun-fire', gradient: 'from-red-500 via-orange-500 to-yellow-400', emoji: '🔥', title: 'Hot hot', effect: 'sparkle', category: 'fun' },
  { id: 'fun-rainbow', gradient: 'from-red-400 via-yellow-400 to-blue-400', emoji: '🦄', title: 'Unicorn', effect: 'rainbow', category: 'fun' },
  { id: 'fun-angel', gradient: 'from-sky-300 via-blue-300 to-purple-300', emoji: '😇', title: 'Thiên thần', effect: 'sparkle', category: 'fun' },
];

const formatNumber = (num: number) => {
  // Always show full number
  return num.toLocaleString('vi-VN');
};

const shortenWallet = (address: string | null | undefined) => {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const CreateGiftPostModal: React.FC<CreateGiftPostModalProps> = ({
  isOpen,
  onClose,
  giftData,
}) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(giftTemplates[0]);
  const [selectedSound, setSelectedSound] = useState(giftSoundOptions[0]);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [customMessage, setCustomMessage] = useState(
    giftData.message || `Gửi tặng @${giftData.receiverName} với tất cả yêu thương! 💖`
  );
  const [isPosting, setIsPosting] = useState(false);

  const playPreviewSound = (soundUrl: string) => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    
    audioPreviewRef.current = new Audio(soundUrl);
    audioPreviewRef.current.volume = 0.4;
    audioPreviewRef.current.onended = () => setIsPlayingPreview(false);
    audioPreviewRef.current.play()
      .then(() => setIsPlayingPreview(true))
      .catch(() => console.log('Preview blocked'));
  };

  const stopPreviewSound = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    }
  };

  const handlePost = async () => {
    if (!user) return;
    
    // Stop any preview sound
    stopPreviewSound();

    setIsPosting(true);
    try {
      // Create the post with gift info in hashtags
      const hashtags = ['#FunFarmGift', '#TặngQuà', `#${selectedTemplate.title}`];
      
      // Generate content in the new format:
      // "🎁 @ReceiverName vừa được @SenderName tặng X CAMLY kèm lời nhắn: "message""
      const senderDisplayName = profile?.display_name || 'Ai đó';
      const formattedAmount = formatNumber(giftData.amount);
      
      // Include sound ID in content for playback
      const postContent = `${selectedTemplate.emoji} 🎁 @${giftData.receiverName} vừa được @${senderDisplayName} tặng ${formattedAmount} ${giftData.currency} kèm lời nhắn:\n\n` +
        `"${customMessage}"\n\n` +
        `🎁 Đã tặng ${formattedAmount} ${giftData.currency} cho @${giftData.receiverName}\n\n` +
        `${hashtags.join(' ')}\n[sound:${selectedSound.id}]`;

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          content: postContent,
          post_type: 'gift',
          hashtags: hashtags,
          gift_receiver_id: giftData.receiverId,
          receiver_approved: true, // Default approved, receiver can hide later
          sender_wallet: profile?.wallet_address || null,
          receiver_wallet: giftData.receiverWallet || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Link post_id back to wallet_transaction for bidirectional sync
      // Find the most recent transaction from sender to receiver within last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await supabase
        .from('wallet_transactions')
        .update({ post_id: post.id })
        .eq('sender_id', user.id)
        .eq('receiver_id', giftData.receiverId)
        .eq('currency', giftData.currency)
        .gte('created_at', fiveMinutesAgo)
        .is('post_id', null)
        .order('created_at', { ascending: false })
        .limit(1);

      // Create notification for receiver
      await supabase.from('notifications').insert({
        user_id: giftData.receiverId,
        from_user_id: user.id,
        type: 'gift_post',
        post_id: post.id,
        content: `${profile?.display_name || 'Ai đó'} đã đăng bài chúc mừng tặng bạn ${formatNumber(giftData.amount)} ${giftData.currency}!`,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Đăng bài chúc mừng
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Gift Card Preview with animated effects */}
          <div 
            className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${selectedTemplate.gradient} p-6 text-white shadow-xl`}
          >
            {/* Animated background effects based on template */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Sparkle particles */}
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-white/60 animate-pulse"
                  style={{
                    left: `${10 + (i % 4) * 25}%`,
                    top: `${10 + Math.floor(i / 4) * 30}%`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: `${1 + Math.random()}s`,
                  }}
                />
              ))}
              {/* Floating emojis */}
              <div className="absolute top-2 left-4 text-4xl opacity-30 animate-bounce">{selectedTemplate.emoji}</div>
              <div className="absolute bottom-2 right-4 text-4xl opacity-30 animate-bounce" style={{ animationDelay: '0.5s' }}>{selectedTemplate.emoji}</div>
              <div className="absolute top-1/2 right-8 text-2xl opacity-20 animate-pulse">{selectedTemplate.emoji}</div>
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Gift className="w-6 h-6" />
                  <span className="font-bold text-lg">Fun Farm Gift</span>
                </div>
                <span className="text-4xl animate-bounce">{selectedTemplate.emoji}</span>
              </div>

              {/* Sender to Receiver */}
              <div className="flex items-center justify-center gap-4 my-6">
                <div className="flex flex-col items-center">
                  <Avatar className="w-14 h-14 border-2 border-white/50 ring-2 ring-white/30 ring-offset-2 ring-offset-transparent">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-white/20 text-white">
                      {profile?.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm mt-1 font-medium truncate max-w-[80px]">
                    {profile?.display_name || 'Bạn'}
                  </span>
                  {profile?.wallet_address && (
                    <span className="text-[10px] opacity-70 font-mono">
                      {shortenWallet(profile.wallet_address)}
                    </span>
                  )}
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
                  <Avatar className="w-14 h-14 border-2 border-white/50 ring-2 ring-white/30 ring-offset-2 ring-offset-transparent">
                    <AvatarImage src={giftData.receiverAvatar || ''} />
                    <AvatarFallback className="bg-white/20 text-white">
                      {giftData.receiverName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm mt-1 font-medium truncate max-w-[80px]">
                    {giftData.receiverName}
                  </span>
                  {giftData.receiverWallet && (
                    <span className="text-[10px] opacity-70 font-mono">
                      {shortenWallet(giftData.receiverWallet)}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount with coin animation */}
              <div className="text-center bg-white/20 rounded-xl py-3 px-4 backdrop-blur-sm border border-white/30">
                <div className="flex items-center justify-center gap-2">
                  <img src={camlyCoinImg} alt="coin" className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="text-3xl font-bold">{formatNumber(giftData.amount)}</span>
                  <span className="text-lg">{giftData.currency}</span>
                </div>
              </div>

              {/* Message preview */}
              {giftData.message && (
                <div className="mt-4 text-center italic opacity-90 text-sm bg-white/10 rounded-lg p-2">
                  "{giftData.message}"
                </div>
              )}
            </div>
          </div>

          {/* Template Selection - Scrollable grid */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Chọn kiểu thiệp ({giftTemplates.length} mẫu)
            </label>
            <div className="grid grid-cols-5 gap-2 max-h-[180px] overflow-y-auto p-1">
              {giftTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    selectedTemplate.id === template.id
                      ? 'border-primary bg-primary/10 scale-105 shadow-lg'
                      : 'border-muted hover:border-muted-foreground hover:scale-102'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${template.gradient} flex items-center justify-center`}>
                    <span className="text-lg">{template.emoji}</span>
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight">{template.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sound Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-500" />
              Chọn âm thanh ({giftSoundOptions.length} mẫu)
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-[120px] overflow-y-auto p-1">
              {giftSoundOptions.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => {
                    setSelectedSound(sound);
                    playPreviewSound(sound.url);
                  }}
                  className={`p-2 rounded-xl border-2 transition-all flex items-center gap-2 ${
                    selectedSound.id === sound.id
                      ? 'border-primary bg-primary/10 scale-105 shadow-lg'
                      : 'border-muted hover:border-muted-foreground'
                  }`}
                >
                  <span className="text-lg">{sound.emoji}</span>
                  <span className="text-xs font-medium truncate">{sound.name}</span>
                  {selectedSound.id === sound.id && isPlayingPreview ? (
                    <Pause className="w-3 h-3 ml-auto flex-shrink-0" onClick={(e) => { e.stopPropagation(); stopPreviewSound(); }} />
                  ) : (
                    <Play className="w-3 h-3 ml-auto flex-shrink-0 opacity-50" />
                  )}
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
