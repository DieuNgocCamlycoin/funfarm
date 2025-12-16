import { Link } from "react-router-dom";
import { Post } from "@/types/feed";
import { Badge } from "@/components/ui/badge";
import { GoodHeartBadge } from "@/components/GoodHeartBadge";
import { CheckCircle2, MapPin, ExternalLink, AlertCircle, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SharedPostCardProps {
  originalPost: Post | null;
  className?: string;
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

const timeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const SharedPostCard = ({ originalPost, className }: SharedPostCardProps) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Handle case when original post is deleted
  if (!originalPost) {
    return (
      <div className={cn(
        "border border-border rounded-xl bg-muted/30 overflow-hidden p-6 text-center",
        className
      )}>
        <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground font-medium">Bài viết gốc đã bị xóa</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Nội dung này không còn khả dụng</p>
      </div>
    );
  }

  // Check if first media is video
  const firstMedia = originalPost.images?.[0];
  const isVideo = firstMedia && (
    firstMedia.toLowerCase().includes('.mp4') || 
    firstMedia.toLowerCase().includes('.webm') ||
    firstMedia.toLowerCase().includes('.mov')
  );

  return (
    <div className={cn(
      "border border-border rounded-xl bg-muted/30 overflow-hidden hover:bg-muted/50 transition-colors",
      className
    )}>
      {/* Original Post Header */}
      <Link 
        to={`/user/${originalPost.author.id}`}
        className="p-3 flex items-center gap-2 hover:bg-muted/50 transition-colors"
      >
        <div className="relative flex-shrink-0">
          <img 
            src={originalPost.author.avatar} 
            alt={originalPost.author.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20"
          />
          <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">
            {getUserTypeIcon(originalPost.author.type)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">
              {originalPost.author.name}
            </span>
            {originalPost.author.verified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/20 flex-shrink-0" />
            )}
            {originalPost.author.isGoodHeart && (
              <GoodHeartBadge size="sm" />
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {timeAgo(originalPost.createdAt)}
          </span>
        </div>
      </Link>

      {/* Original Post Content */}
      <div className="px-3 pb-3">
        <p className="text-sm text-foreground whitespace-pre-line line-clamp-4">
          {originalPost.content}
        </p>
        
        {/* Hashtags */}
        {originalPost.hashtags && originalPost.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {originalPost.hashtags.slice(0, 3).map((tag) => (
              <span 
                key={tag} 
                className="text-primary text-xs font-medium"
              >
                #{tag}
              </span>
            ))}
            {originalPost.hashtags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{originalPost.hashtags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Location */}
        {originalPost.location && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{originalPost.location}</span>
          </div>
        )}
      </div>

      {/* Original Post Media (image or video) */}
      {originalPost.images && originalPost.images.length > 0 && (
        <div className="relative">
          {isVideo ? (
            // Video display
            <div className="relative bg-black">
              <video
                src={firstMedia}
                className="w-full h-48 object-contain"
                controls={isVideoPlaying}
                playsInline
                muted
                preload="metadata"
                onClick={() => setIsVideoPlaying(true)}
              />
              {!isVideoPlaying && (
                <button
                  onClick={() => setIsVideoPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                    <Play className="w-6 h-6 text-primary-foreground fill-primary-foreground ml-1" />
                  </div>
                </button>
              )}
            </div>
          ) : (
            // Image display
            <img 
              src={originalPost.images[0]} 
              alt="Shared post image"
              className="w-full h-48 object-cover"
            />
          )}
          {originalPost.images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded-full">
              +{originalPost.images.length - 1} {isVideo ? 'video/ảnh' : 'ảnh'}
            </div>
          )}
        </div>
      )}

      {/* Product indicator */}
      {originalPost.is_product_post && originalPost.product_name && (
        <div className="px-3 py-2 bg-primary/10 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <span>🛒</span>
            <span className="font-medium text-primary">{originalPost.product_name}</span>
            {originalPost.price_camly && (
              <Badge variant="secondary" className="ml-auto">
                {originalPost.price_camly.toLocaleString()} CAMLY/kg
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* View Original Post Button */}
      <Link 
        to={`/post/${originalPost.id}`}
        className="flex items-center justify-center gap-2 px-3 py-2.5 border-t border-border text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Xem bài viết gốc
      </Link>
    </div>
  );
};

export default SharedPostCard;
