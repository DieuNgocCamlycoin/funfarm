import { useState } from "react";
import { Post } from "@/types/feed";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SharedPostCard } from "./SharedPostCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SharePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onShareComplete?: () => void;
}

const profileTypeEmojis: Record<string, string> = {
  farmer: '🧑‍🌾',
  fisher: '🎣',
  eater: '🍽️',
  restaurant: '👨‍🍳',
  distributor: '📦',
  shipper: '🚚',
};

export const SharePostModal = ({ isOpen, onClose, post, onShareComplete }: SharePostModalProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [shareComment, setShareComment] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  // Get the original post ID (in case sharing a shared post)
  const originalPostId = post.original_post_id || post.id;

  const handleShare = async () => {
    if (!user?.id) {
      toast.error("Vui lòng đăng nhập để chia sẻ");
      return;
    }

    setIsSharing(true);
    try {
      // Check if user already shared this original post
      const { data: existingShare } = await supabase
        .from('post_shares')
        .select('id')
        .eq('post_id', originalPostId)
        .eq('user_id', user.id)
        .maybeSingle();

      const isFirstShare = !existingShare;

      // 1. Record share in post_shares table (for rewards tracking)
      if (isFirstShare) {
        await supabase
          .from('post_shares')
          .insert({
            post_id: originalPostId,
            user_id: user.id
          });
      }

      // 2. Create a new share post on user's wall
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          content: shareComment.trim() || null,
          post_type: 'share',
          original_post_id: originalPostId,
          images: [],
          hashtags: [],
        })
        .select('id')
        .single();

      if (postError) throw postError;

      // Success!
      if (isFirstShare) {
        toast.success('+20.000 CAMLY cho bạn! 🎉 Bài chia sẻ đã hiển thị trên tường của bạn!', { duration: 3000 });
        refreshProfile();
      } else {
        toast.success('Bài chia sẻ đã hiển thị trên tường của bạn! 💚', { duration: 3000 });
      }

      setShareComment("");
      onClose();
      onShareComplete?.();

      // Also try native share
      if (navigator.share) {
        try {
          await navigator.share({
            title: post.author.name,
            text: post.content.substring(0, 100),
            url: window.location.origin,
          });
        } catch (e) {
          // User cancelled or not supported - ignore
        }
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      toast.error('Có lỗi khi chia sẻ bài viết');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Chia sẻ bài viết
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10">
                {profileTypeEmojis[profile?.profile_type || 'farmer']}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">
                {profile?.display_name || 'FUN Farmer'}
              </p>
              <p className="text-sm text-muted-foreground">
                Chia sẻ lên tường của bạn
              </p>
            </div>
          </div>

          {/* Share comment */}
          <Textarea
            placeholder="Viết suy nghĩ của bạn về bài viết này... (tùy chọn)"
            value={shareComment}
            onChange={(e) => setShareComment(e.target.value)}
            className="min-h-[80px] resize-none"
          />

          {/* Preview original post */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Bài viết gốc:</p>
            <SharedPostCard originalPost={post.original_post || post} />
          </div>

          {/* Share button */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isSharing}>
              Hủy
            </Button>
            <Button 
              onClick={handleShare} 
              disabled={isSharing}
              className="gradient-hero border-0"
            >
              {isSharing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang chia sẻ...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Chia sẻ ngay
                </>
              )}
            </Button>
          </div>

          {/* Reward notice */}
          <p className="text-xs text-center text-muted-foreground">
            💚 Chia sẻ lần đầu nhận +20.000 CAMLY. Bài chia sẻ sẽ hiện trên tường cá nhân của bạn.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SharePostModal;
