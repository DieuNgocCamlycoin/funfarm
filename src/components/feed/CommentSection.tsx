import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Send, MoreHorizontal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { QUALITY_COMMENT_REWARD } from "@/lib/constants";
import { formatLocalDateTime } from "@/lib/dateUtils";

interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
  content: string;
  createdAt: string;
  likes_count: number;
  isLiked: boolean;
}

interface CommentSectionProps {
  postId: string;
  isOpen: boolean;
  onCommentAdded?: () => void;
}

const CommentSection = ({ postId, isOpen, onCommentAdded }: CommentSectionProps) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch real comments from database
  useEffect(() => {
    if (!isOpen) return;

    const fetchComments = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            likes_count,
            created_at,
            author_id,
            profiles:author_id (
              id,
              display_name,
              avatar_url
            )
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedComments: Comment[] = (data || []).map((c: any) => ({
          id: c.id,
          author: {
            id: c.author_id,
            name: c.profiles?.display_name || 'Người dùng',
            avatar: c.profiles?.avatar_url || null,
          },
          content: c.content,
          createdAt: formatTimeAgo(c.created_at),
          likes_count: c.likes_count,
          isLiked: false,
        }));

        setComments(formattedComments);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [postId, isOpen]);

  const formatTimeAgo = (dateString: string) => {
    return formatLocalDateTime(dateString);
  };

  const handleLikeComment = (commentId: string) => {
    setComments(comments.map(c => 
      c.id === commentId 
        ? { ...c, isLiked: !c.isLiked, likes_count: c.isLiked ? c.likes_count - 1 : c.likes_count + 1 }
        : c
    ));
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user?.id) return;
    
    setIsSubmitting(true);
    try {
      // Check content with AI before commenting
      const checkResponse = await supabase.functions.invoke('check-content', {
        body: { 
          content: newComment.trim(), 
          type: 'comment',
          userId: user.id,
          postId: postId
        }
      });

      if (checkResponse.data && !checkResponse.data.isValid) {
        toast.error(
          <div>
            <p>{checkResponse.data.reason || 'Bình luận đang được kiểm tra'}</p>
            <p className="text-xs opacity-80 mt-1">Admin sẽ review lại trong 24h ❤️</p>
          </div>,
          { duration: 5000 }
        );
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content: newComment.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Add new comment to the top of the list
      const newCommentObj: Comment = {
        id: data.id,
        author: {
          id: user.id,
          name: profile?.display_name || 'Bạn',
          avatar: profile?.avatar_url || null,
        },
        content: newComment.trim(),
        createdAt: 'Vừa xong',
        likes_count: 0,
        isLiked: false,
      };
      
      setComments([newCommentObj, ...comments]);
      setNewComment("");

      // Update comments count on post
      await supabase
        .from('posts')
        .update({ comments_count: comments.length + 1 })
        .eq('id', postId);

      // Notify parent about new comment
      onCommentAdded?.();

      // V3.1: Only show reward notification for quality comments (>20 characters)
      const isQualityComment = newComment.trim().length > 20;
      if (isQualityComment) {
        toast.success(`+${QUALITY_COMMENT_REWARD.toLocaleString()} CAMLY cho comment chất lượng! 💬`, { duration: 2000 });
      } else {
        toast.success('Đã gửi bình luận thành công! 🌱', { duration: 2000 });
      }

    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Có lỗi khi gửi bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="px-4 py-3 border-t border-border bg-muted/30 space-y-4">
      {/* Comment Input */}
      <div className="flex gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {profile?.display_name?.[0] || '👤'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Viết bình luận..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !isSubmitting && handleAddComment()}
            className="bg-background"
            disabled={isSubmitting}
          />
          <Button
            size="icon"
            onClick={handleAddComment}
            disabled={!newComment.trim() || isSubmitting}
            className="gradient-hero border-0"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="w-8 h-8">
                <AvatarImage src={comment.author.avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {comment.author.name?.[0] || '👤'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-muted rounded-2xl px-4 py-2">
                  <span className="font-semibold text-sm text-foreground">
                    {comment.author.name}
                  </span>
                  <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
                </div>
                
                <div className="flex items-center gap-4 mt-1 px-2">
                  <span className="text-xs text-muted-foreground">{comment.createdAt}</span>
                  <button
                    onClick={() => handleLikeComment(comment.id)}
                    className={cn(
                      "text-xs font-medium flex items-center gap-1",
                      comment.isLiked ? "text-destructive" : "text-muted-foreground hover:text-destructive"
                    )}
                  >
                    <Heart className={cn("w-3 h-3", comment.isLiked && "fill-current")} />
                    {comment.likes_count > 0 && comment.likes_count}
                  </button>
                  <button className="text-xs font-medium text-muted-foreground hover:text-foreground">
                    Trả lời
                  </button>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;