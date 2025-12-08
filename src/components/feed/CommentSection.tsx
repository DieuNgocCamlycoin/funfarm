import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Send, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
    username: string;
  };
  content: string;
  createdAt: string;
  likes: number;
  isLiked: boolean;
}

interface CommentSectionProps {
  postId: string;
  isOpen: boolean;
}

const mockComments: Comment[] = [
  {
    id: "1",
    author: {
      name: "Nguyễn Văn A",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      username: "nguyenvana",
    },
    content: "Sản phẩm tươi ngon quá! Đã đặt hàng rồi ạ 🥬",
    createdAt: "2 giờ trước",
    likes: 12,
    isLiked: false,
  },
  {
    id: "2",
    author: {
      name: "Trần Thị B",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      username: "tranthib",
    },
    content: "Cho mình xin địa chỉ để mua trực tiếp với ạ",
    createdAt: "1 giờ trước",
    likes: 5,
    isLiked: true,
  },
];

const CommentSection = ({ postId, isOpen }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [newComment, setNewComment] = useState("");

  const handleLikeComment = (commentId: string) => {
    setComments(comments.map(c => 
      c.id === commentId 
        ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 }
        : c
    ));
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      author: {
        name: "Bạn",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
        username: "you",
      },
      content: newComment,
      createdAt: "Vừa xong",
      likes: 0,
      isLiked: false,
    };
    
    setComments([comment, ...comments]);
    setNewComment("");
  };

  if (!isOpen) return null;

  return (
    <div className="px-4 py-3 border-t border-border bg-muted/30 space-y-4">
      {/* Comment Input */}
      <div className="flex gap-3">
        <img
          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
          alt="Your avatar"
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Viết bình luận..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
            className="bg-background"
          />
          <Button
            size="icon"
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="gradient-hero border-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 group">
            <img
              src={comment.author.avatar}
              alt={comment.author.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="bg-muted rounded-2xl px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">
                    {comment.author.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    @{comment.author.username}
                  </span>
                </div>
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
                  {comment.likes > 0 && comment.likes}
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
        ))}
      </div>
    </div>
  );
};

export default CommentSection;
