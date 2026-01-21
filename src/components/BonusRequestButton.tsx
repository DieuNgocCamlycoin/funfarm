import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BonusRequestButtonProps {
  postId: string;
  userId: string;
  hasLocation?: boolean;
  hasImages?: boolean;
  hasContent?: boolean;
}

export const BonusRequestButton = ({ 
  postId, 
  userId,
  hasLocation = false,
  hasImages = false,
  hasContent = false
}: BonusRequestButtonProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // V3.1: Quality post = content + images (location is NOT a criteria)
  const isQualityPost = hasContent && hasImages;
  
  if (!isQualityPost) return null;

  const handleRequestBonus = async () => {
    setIsSubmitting(true);
    try {
      // Check if already requested
      const { data: existing } = await supabase
        .from('bonus_requests')
        .select('id, status')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') {
          toast.info('Yêu cầu của bạn đang chờ duyệt! ⏳');
        } else if (existing.status === 'approved') {
          toast.success('Bài viết này đã được duyệt bonus rồi! 🎉');
        } else {
          toast.info('Yêu cầu này đã được xem xét trước đó');
        }
        setIsSubmitted(true);
        return;
      }

      // Submit request
      await supabase
        .from('bonus_requests')
        .insert({
          post_id: postId,
          user_id: userId
        });

      setIsSubmitted(true);
      toast.success('Đã gửi yêu cầu bonus +50%! Admin sẽ xem xét sớm 🌟', { duration: 4000 });
    } catch (error) {
      console.error('Error requesting bonus:', error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        disabled
        className="gap-2 text-green-600 dark:text-green-400"
      >
        <Check className="w-4 h-4" />
        Đã gửi xét duyệt
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleRequestBonus}
      disabled={isSubmitting}
      className="gap-2 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
    >
      {isSubmitting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      Gửi xét duyệt bonus +50%
    </Button>
  );
};
