import React, { useEffect, useState, useRef } from 'react';
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
  Pause,
  ShieldCheck,
  PartyPopper,
  Trophy,
  Sprout,
  CakeSlice,
  Coins,
  HandHeart,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import camlyCoinImg from '@/assets/camly_coin.png';
import logoFunFarm from '@/assets/logo_fun_farm_web3.png';
import gratitudeBg from '@/assets/gift-themes/gratitude.jpeg';
import loveBg from '@/assets/gift-themes/love.jpeg';
import celebrationBg from '@/assets/gift-themes/celebration.jpeg';
import gratitudeDaisyBg from '@/assets/gift-themes/gratitude-daisy.jpeg';
import gratitudeMeadowBg from '@/assets/gift-themes/gratitude-meadow.jpeg';
import gratitudeMorningBg from '@/assets/gift-themes/gratitude-morning.jpeg';
import gratitudeLightBg from '@/assets/gift-themes/gratitude-light.jpeg';
import loveRoseBg from '@/assets/gift-themes/love-rose.jpeg';
import loveRainbowBg from '@/assets/gift-themes/love-rainbow.jpeg';
import loveTulipBg from '@/assets/gift-themes/love-tulip.jpeg';
import loveHeartsBg from '@/assets/gift-themes/love-hearts.jpeg';
import celebrationBalloonsBg from '@/assets/gift-themes/celebration-balloons.jpeg';
import celebrationSparkleBg from '@/assets/gift-themes/celebration-sparkle.jpeg';
import celebrationLightBg from '@/assets/gift-themes/celebration-light.jpeg';
import celebrationRainbowBg from '@/assets/gift-themes/celebration-rainbow.jpeg';
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
    transactionId: string;
    txHash: string;
  };
}

const giftMessages = {
  gratitude: 'Biết ơn bạn vì những điều tốt đẹp bạn đã trao tặng cho cuộc sống. Gửi đến bạn món quà ngập tràn năng lượng yêu thương thay lời cảm ơn. Chúc bạn luôn hạnh phúc, giàu sang, sung sướng đủ đầy. 💚',
  love: 'Gửi bạn thật nhiều năng lượng ánh sáng yêu thương thuần khiết. Chúc mỗi ngày của bạn đều ngập tràn hạnh phúc, thịnh vượng, giàu sang, sung sướng, đủ đầy. ✨',
  celebration: 'Chúc mừng bạn nha! Chúc cho niềm vui hôm nay sẽ mở ra thêm nhiều điều tuyệt vời phía trước. Chúc bạn ngày càng thành công, hạnh phúc, thịnh vượng, giàu sang, sung sướng, đủ đầy. 🌟',
};

// Three lasting themes, shared by the transfer form, preview and published card.
const giftTemplates = [
  { id: 'gratitude', emoji: '🙌', title: 'Biết ơn', message: giftMessages.gratitude, backgrounds: [
    { id: 'gratitude-leaves', name: 'Lá nắng', src: gratitudeBg },
    { id: 'gratitude-daisy', name: 'Cúc sớm', src: gratitudeDaisyBg },
    { id: 'gratitude-meadow', name: 'Đồng cỏ', src: gratitudeMeadowBg },
    { id: 'gratitude-morning', name: 'Bình minh', src: gratitudeMorningBg },
    { id: 'gratitude-light', name: 'Ánh xanh', src: gratitudeLightBg },
  ] },
  { id: 'love', emoji: '💗', title: 'Yêu thương', message: giftMessages.love, backgrounds: [
    { id: 'love-blossom', name: 'Hoa mơ', src: loveBg },
    { id: 'love-rose', name: 'Hồng sương', src: loveRoseBg },
    { id: 'love-rainbow', name: 'Cầu vồng', src: loveRainbowBg },
    { id: 'love-tulip', name: 'Tulip', src: loveTulipBg },
    { id: 'love-hearts', name: 'Trái tim', src: loveHeartsBg },
  ] },
  { id: 'celebration', emoji: '🎉', title: 'Chúc mừng', message: giftMessages.celebration, backgrounds: [
    { id: 'celebration-party', name: 'Dạ tiệc', src: celebrationBg },
    { id: 'celebration-balloons', name: 'Bóng bay', src: celebrationBalloonsBg },
    { id: 'celebration-sparkle', name: 'Kim tuyến', src: celebrationSparkleBg },
    { id: 'celebration-light', name: 'Ánh sáng', src: celebrationLightBg },
    { id: 'celebration-rainbow', name: 'Cầu vồng', src: celebrationRainbowBg },
  ] },
];

const TemplateIcon = ({ id, className = 'h-5 w-5' }: { id: string; className?: string }) => {
  const props = { className, strokeWidth: 1.7 };
  if (id === 'love') return <Heart {...props} />;
  if (id === 'gratitude') return <HandHeart {...props} />;
  if (id === 'celebration') return <PartyPopper {...props} />;
  if (id === 'trophy') return <Trophy {...props} />;
  if (id === 'farm') return <Sprout {...props} />;
  if (id === 'birthday-cake') return <CakeSlice {...props} />;
  if (id === 'tet-lucky' || id === 'crypto-money') return <Coins {...props} />;
  return <Star {...props} />;
};

const curatedSoundOptions = giftSoundOptions.filter((sound) =>
  ['rich1', 'rich2', 'hearts', 'confetti', 'nature'].includes(sound.id)
);

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
  const [selectedTemplate, setSelectedTemplate] = useState(
    giftTemplates.find((template) => template.message === giftData.message) || giftTemplates[0]
  );
  const [selectedSound, setSelectedSound] = useState(curatedSoundOptions[0]);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState(giftTemplates[0].backgrounds[0].id);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [customMessage, setCustomMessage] = useState(
    giftData.message || giftTemplates[0].message
  );
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const matchedTheme = giftTemplates.find((template) => template.message === giftData.message);
    if (matchedTheme) {
      setSelectedTemplate(matchedTheme);
      setSelectedBackgroundId(matchedTheme.backgrounds[0].id);
    }
    setCustomMessage(giftData.message || matchedTheme?.message || giftTemplates[0].message);
  }, [giftData.message, isOpen]);

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
        `${hashtags.join(' ')}\n[sound:${selectedSound.id}]\n[gift-theme:${selectedTemplate.id}]\n[gift-bg:${selectedBackgroundId}]`;

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

      const { error: linkError } = await supabase.rpc('link_verified_gift_post', {
        p_transaction_id: giftData.transactionId,
        p_post_id: post.id,
      });
      if (linkError) throw linkError;

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
            className="relative overflow-hidden rounded-2xl border border-[#d6b958] bg-cover bg-center p-4 text-[#26382f] shadow-[0_18px_45px_rgba(45,69,52,0.18)]"
            style={{ backgroundImage: `url(${selectedTemplate.backgrounds.find((background) => background.id === selectedBackgroundId)?.src || selectedTemplate.backgrounds[0].src})` }}
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
              <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
              <div className="absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-100 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={logoFunFarm} alt="FUN FARM" className="h-10 w-10 rounded-full object-cover shadow-sm" />
                  <span className="font-bold text-lg text-[#176b48]">Fun Farm Gift</span>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/70 bg-[linear-gradient(145deg,#fff3ad,#b77b13_48%,#ffe89a)] text-emerald-950 shadow-[0_4px_18px_rgba(255,215,90,0.45)]">
                  <TemplateIcon id={selectedTemplate.id} />
                </div>
              </div>

              {/* Sender to Receiver */}
              <div className="my-3 flex items-center justify-center gap-4">
                <div className="flex flex-col items-center">
                  <Avatar className="h-11 w-11 border-2 border-white/50 ring-2 ring-white/30 ring-offset-1 ring-offset-transparent">
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
                  <Avatar className="h-11 w-11 border-2 border-white/50 ring-2 ring-white/30 ring-offset-1 ring-offset-transparent">
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
              <div className="rounded-xl border border-white/30 bg-white/20 px-4 py-2 text-center backdrop-blur-sm">
                <div className="flex items-center justify-center gap-2">
                  <img src={camlyCoinImg} alt="coin" className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="text-3xl font-bold">{formatNumber(giftData.amount)}</span>
                  <span className="text-lg">{giftData.currency}</span>
                </div>
              </div>

              {/* Message preview */}
              {customMessage && (
                <div className="mt-2 rounded-lg border border-white/70 bg-white/75 p-2 text-center text-sm italic shadow-sm backdrop-blur-md">
                  "{customMessage}"
                </div>
              )}

              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/35 bg-black/15 px-3 py-2 text-[11px] backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span className="font-semibold">BSC đã xác minh</span>
                <span className="min-w-0 flex-1 truncate text-right font-mono" title={giftData.txHash}>{shortenWallet(giftData.txHash)}</span>
              </div>
            </div>
          </div>

          {/* Template Selection - Scrollable grid */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Chọn chủ đề ({giftTemplates.length} chủ đề)
            </label>
            <div className="grid grid-cols-3 gap-2 p-1">
              {giftTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => { setSelectedTemplate(template); setSelectedBackgroundId(template.backgrounds[0].id); setCustomMessage(template.message); }}
                  className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    selectedTemplate.id === template.id
                      ? 'border-amber-500 bg-amber-50 scale-105 shadow-lg'
                      : 'border-amber-200/60 hover:border-amber-400 hover:scale-102'
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/80 bg-[linear-gradient(145deg,#fff3ad,#bd8420_52%,#ffe9a0)] text-emerald-950 shadow-sm">
                    <TemplateIcon id={template.id} className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight">{template.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Chọn hình nền · {selectedTemplate.title}</label>
            <div className="grid grid-cols-5 gap-2">
              {selectedTemplate.backgrounds.map((background) => (
                <button
                  key={background.id}
                  type="button"
                  onClick={() => setSelectedBackgroundId(background.id)}
                  className={`group overflow-hidden rounded-xl border-2 bg-white p-1 transition ${selectedBackgroundId === background.id ? 'border-amber-500 shadow-md' : 'border-transparent hover:border-amber-200'}`}
                  title={background.name}
                >
                  <img src={background.src} alt={background.name} className="aspect-square w-full rounded-lg object-cover" />
                  <span className="mt-1 block truncate text-[9px] text-muted-foreground">{background.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sound Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-500" />
              Chọn âm thanh ({curatedSoundOptions.length} mẫu tinh tuyển)
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-[120px] overflow-y-auto p-1">
              {curatedSoundOptions.map((sound) => (
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
