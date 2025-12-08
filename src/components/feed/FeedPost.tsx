import { useState, useRef, useEffect } from "react";
import { Post } from "@/types/feed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CommentSection from "./CommentSection";
import { ReactionPicker, Reaction, reactions } from "./ReactionPicker";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MapPin, 
  ShoppingCart, 
  MoreHorizontal,
  CheckCircle2,
  Radio,
  Leaf,
  Clock,
  Package,
  UserPlus,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedPostProps {
  post: Post;
}

const getUserTypeIcon = (type: string) => {
  switch (type) {
    case 'farm': return '🌱';
    case 'fisher': return '🐟';
    case 'ranch': return '🐄';
    case 'reviewer': return '⭐';
    case 'restaurant': return '🍽️';
    case 'distributor': return '📦';
    default: return '👤';
  }
};

const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

const timeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return 'Vừa xong';
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

const FeedPost = ({ post }: FeedPostProps) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [currentReaction, setCurrentReaction] = useState<Reaction | null>(null);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const likeButtonRef = useRef<HTMLButtonElement>(null);

  const handleLikeClick = () => {
    if (currentReaction) {
      setCurrentReaction(null);
      setIsLiked(false);
      setLikes(likes - 1);
    } else {
      setCurrentReaction(reactions[0]); // Default to "Thích"
      setIsLiked(true);
      setLikes(likes + 1);
    }
  };

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowReactionPicker(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleReactionSelect = (reaction: Reaction) => {
    if (!currentReaction) {
      setLikes(likes + 1);
    }
    setCurrentReaction(reaction);
    setIsLiked(true);
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleSave = () => {
    setIsSaved(!isSaved);
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.author.name,
        text: post.content.substring(0, 100),
        url: window.location.href,
      });
    }
  };

  return (
    <article className="bg-card rounded-2xl shadow-card border border-border overflow-hidden transition-all duration-300 hover:shadow-soft">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={post.author.avatar} 
              alt={post.author.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
            />
            <span className="absolute -bottom-1 -right-1 text-sm">
              {getUserTypeIcon(post.author.type)}
            </span>
            {post.isLive && (
              <span className="absolute -top-1 -left-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <Radio className="w-3 h-3" />
                LIVE
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-foreground">{post.author.name}</h3>
              {post.author.verified && (
                <CheckCircle2 className="w-4 h-4 text-primary fill-primary/20" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>@{post.author.username}</span>
              <span>•</span>
              <span>{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
            ⭐ {post.author.reputationScore}
          </Badge>
          <Button
            variant={isFollowing ? "secondary" : "outline"}
            size="sm"
            onClick={handleFollow}
            className={cn(
              "gap-1 text-xs",
              isFollowing && "bg-primary/10 text-primary"
            )}
          >
            <UserPlus className="w-3 h-3" />
            {isFollowing ? "Đang follow" : "Follow"}
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-foreground whitespace-pre-line leading-relaxed">{post.content}</p>
        
        {/* Hashtags */}
        <div className="flex flex-wrap gap-2 mt-3">
          {post.hashtags.map((tag) => (
            <span 
              key={tag} 
              className="text-primary hover:text-primary/80 cursor-pointer text-sm font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Location */}
        {post.location && (
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{post.location}</span>
          </div>
        )}
      </div>

      {/* Images */}
      {post.images.length > 0 && (
        <div className="relative">
          <div className="aspect-[4/3] overflow-hidden">
            <img 
              src={post.images[currentImageIndex]} 
              alt="Post image"
              className="w-full h-full object-cover"
            />
          </div>
          {post.images.length > 1 && (
            <>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {post.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === currentImageIndex 
                        ? "bg-primary w-4" 
                        : "bg-primary/40 hover:bg-primary/60"
                    )}
                  />
                ))}
              </div>
              <div className="absolute top-3 right-3 bg-foreground/60 text-background text-xs px-2 py-1 rounded-full">
                {currentImageIndex + 1}/{post.images.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Product Card */}
      {post.product && (
        <div className="mx-4 my-3 p-4 bg-muted/50 rounded-xl border border-border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-display font-semibold text-foreground">{post.product.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                {post.product.organic && (
                  <Badge className="bg-primary/10 text-primary border-0 gap-1">
                    <Leaf className="w-3 h-3" />
                    Hữu cơ
                  </Badge>
                )}
                {post.product.certifications.map((cert) => (
                  <Badge key={cert} variant="outline" className="text-xs">
                    {cert}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-xl text-primary">
                {formatPrice(post.product.price)}
              </p>
              <p className="text-sm text-muted-foreground">/{post.product.unit}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              <span>Còn {post.product.stock} {post.product.unit}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Giao: {post.product.estimatedDelivery}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 gradient-hero border-0" size="lg">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Mua ngay
            </Button>
            <Button variant="outline" size="lg">
              Thêm vào giỏ
            </Button>
            <Button variant="ghost" size="lg">
              Chat
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="relative">
            <Button 
              ref={likeButtonRef}
              variant="ghost" 
              size="sm" 
              onClick={handleLikeClick}
              onMouseDown={handleLongPressStart}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={handleLongPressStart}
              onTouchEnd={handleLongPressEnd}
              className={cn(
                "gap-2 transition-all duration-300",
                currentReaction && currentReaction.color
              )}
            >
              {currentReaction ? (
                <span className="text-xl">{currentReaction.emoji}</span>
              ) : (
                <Heart className="w-5 h-5" />
              )}
              <span>{formatNumber(likes)}</span>
            </Button>
            
            <ReactionPicker
              isOpen={showReactionPicker}
              onClose={() => setShowReactionPicker(false)}
              onSelect={handleReactionSelect}
            />
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "gap-2",
              showComments && "text-primary"
            )}
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className={cn("w-5 h-5", showComments && "fill-primary/20")} />
            <span>{formatNumber(post.comments)}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "gap-2",
              showComments && "text-primary"
            )}
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className={cn("w-5 h-5", showComments && "fill-primary/20")} />
            <span>{formatNumber(post.comments)}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={handleShare}
          >
            <Share2 className="w-5 h-5" />
            <span>{formatNumber(post.shares)}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 hidden sm:flex"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSave}
          className={cn(
            "transition-all duration-300",
            isSaved && "text-accent"
          )}
        >
          <Bookmark className={cn(
            "w-5 h-5 transition-transform",
            isSaved && "fill-current scale-110"
          )} />
        </Button>
      </div>

      {/* Comments Section */}
      <CommentSection postId={post.id} isOpen={showComments} />
    </article>
  );
};

export default FeedPost;
