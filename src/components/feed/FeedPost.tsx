import { useState, useRef, useEffect } from "react";
import { Post } from "@/types/feed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CommentSection from "./CommentSection";
import { ReactionPicker, Reaction, reactions } from "./ReactionPicker";
import ProductPostCard from "./ProductPostCard";
import EditPostModal from "./EditPostModal";
import BuyProductModal from "./BuyProductModal";
import { BonusRequestButton } from "@/components/BonusRequestButton";
import { GoodHeartBadge } from "@/components/GoodHeartBadge";
import { ReportModal } from "@/components/ReportModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  Send,
  Download,
  Pencil,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  
  if (seconds < 60) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  if (weeks < 4) return `${weeks} tuần trước`;
  if (months < 12) return `${months} tháng trước`;
  
  // Format date for older posts
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const FeedPost = ({ post: initialPost }: FeedPostProps) => {
  const { user, refreshProfile } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [isLiked, setIsLiked] = useState(false);
  const [currentReaction, setCurrentReaction] = useState<Reaction | null>(null);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showShareConfirm, setShowShareConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isRewardBanned, setIsRewardBanned] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const [shares, setShares] = useState(post.shares);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const likeButtonRef = useRef<HTMLButtonElement>(null);

  const isOwner = user?.id === post.author.id;

  // Check if user already liked this post and if user is reward banned
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('post_likes')
        .select('id, reaction_type')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setIsLiked(true);
        const foundReaction = reactions.find(r => r.id === data.reaction_type);
        setCurrentReaction(foundReaction || reactions[0]);
      }
    };

    const checkBanStatus = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('reward_bans')
        .select('id, reason, expires_at')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      
      if (data) {
        setIsRewardBanned(true);
      }
    };

    checkLikeStatus();
    checkBanStatus();
  }, [post.id, user?.id]);

  const handleLikeClick = async () => {
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập để thích bài viết');
      return;
    }

    try {
      if (currentReaction) {
        // Unlike - remove from database
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        
        setCurrentReaction(null);
        setIsLiked(false);
        setLikes(prev => Math.max(0, prev - 1));
      } else {
        // Like - add to database (trigger will add CAMLY reward)
        await supabase
          .from('post_likes')
          .insert({
            post_id: post.id,
            user_id: user.id,
            reaction_type: 'like'
          });
        
        setCurrentReaction(reactions[0]);
        setIsLiked(true);
        setLikes(prev => prev + 1);
        
        // Show reward notification
        const currentLikes = likes + 1;
        if (currentLikes <= 3) {
          toast.success(`+10.000 CAMLY cho chủ bài viết! 🎉`, { duration: 2000 });
        } else {
          toast.success(`+1.000 CAMLY cho chủ bài viết!`, { duration: 2000 });
        }
      }
      refreshProfile();
    } catch (error: any) {
      if (error.code === '23505') {
        // Already liked, just update UI
        setIsLiked(true);
      } else {
        console.error('Error toggling like:', error);
        toast.error('Có lỗi xảy ra');
      }
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

  const handleReactionSelect = async (reaction: Reaction) => {
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập để thả cảm xúc');
      return;
    }

    try {
      if (!currentReaction) {
        // New reaction
        await supabase
          .from('post_likes')
          .insert({
            post_id: post.id,
            user_id: user.id,
            reaction_type: reaction.id
          });
        setLikes(prev => prev + 1);
        
        const currentLikes = likes + 1;
        if (currentLikes <= 3) {
          toast.success(`+10.000 CAMLY cho chủ bài viết! 🎉`, { duration: 2000 });
        } else {
          toast.success(`+1.000 CAMLY cho chủ bài viết!`, { duration: 2000 });
        }
        refreshProfile();
      } else {
        // Update existing reaction
        await supabase
          .from('post_likes')
          .update({ reaction_type: reaction.id })
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      }
      setCurrentReaction(reaction);
      setIsLiked(true);
    } catch (error) {
      console.error('Error setting reaction:', error);
    }
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

  const handleShareClick = () => {
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập để chia sẻ');
      return;
    }

    // Show confirmation dialog first
    setShowShareConfirm(true);
  };

  const handleShareConfirm = async () => {
    setShowShareConfirm(false);
    
    if (!user?.id) return;

    try {
      // Check if user is banned from rewards
      if (isRewardBanned) {
        toast.info('FUN FARM là nơi lan tỏa tình yêu chân thành. Bạn đang trong thời gian tạm dừng thưởng. Hãy tiếp tục gieo hạt yêu thương đúng cách nhé! ❤️', { duration: 5000 });
      }

      // Check if user has already shared this post
      const { data: existingShare } = await supabase
        .from('post_shares')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle();

      const isFirstShare = !existingShare;

      // Record share in database (trigger will only reward first share and check ban)
      await supabase
        .from('post_shares')
        .insert({
          post_id: post.id,
          user_id: user.id
        });

      setShares(prev => prev + 1);
      
      if (isFirstShare && !isRewardBanned) {
        toast.success('+20.000 CAMLY cho bạn! 🎉 Cảm ơn bạn đã lan tỏa tình yêu thương!', { duration: 3000 });
        refreshProfile();
      } else if (!isFirstShare) {
        toast.info('Bạn đã lan tỏa tình yêu thương cho bài này rồi! 💚', { duration: 3000 });
      }

      // Also try native share
      if (navigator.share) {
        navigator.share({
          title: post.author.name,
          text: post.content.substring(0, 100),
          url: window.location.href,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <article className="bg-card rounded-2xl shadow-card border border-border overflow-hidden transition-all duration-300 hover:shadow-soft">
      {/* Header */}
      <div className="p-3 sm:p-4 flex items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <img 
              src={post.author.avatar} 
              alt={post.author.name}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-primary/20"
            />
            <span className="absolute -bottom-1 -right-1 text-xs sm:text-sm">
              {getUserTypeIcon(post.author.type)}
            </span>
            {post.isLive && (
              <span className="absolute -top-1 -left-1 bg-destructive text-destructive-foreground text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full flex items-center gap-0.5 sm:gap-1 animate-pulse">
                <Radio className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                LIVE
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-foreground text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{post.author.name}</h3>
              {post.author.verified && (
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary fill-primary/20 flex-shrink-0" />
              )}
              {post.author.isGoodHeart && (
                <GoodHeartBadge size="sm" />
              )}
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 sm:py-0.5 hidden xs:inline-flex">
                ⭐ {post.author.reputationScore}
              </Badge>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="truncate max-w-[80px] sm:max-w-none">@{post.author.username}</span>
              <span>•</span>
              <span className="flex-shrink-0">{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Button
            variant={isFollowing ? "secondary" : "outline"}
            size="sm"
            onClick={handleFollow}
            className={cn(
              "gap-0.5 sm:gap-1 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3",
              isFollowing && "bg-primary/10 text-primary"
            )}
          >
            <UserPlus className="w-3 h-3" />
            <span className="hidden sm:inline">{isFollowing ? "Đang follow" : "Follow"}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground w-7 h-7 sm:w-8 sm:h-8">
                <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner && (
                <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Chỉnh sửa bài viết
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Bookmark className="w-4 h-4 mr-2" />
                Lưu bài viết
              </DropdownMenuItem>
              {!isOwner && (
                <DropdownMenuItem 
                  onClick={() => setShowReportModal(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Báo cáo vi phạm
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 sm:px-4 pb-3">
        <p className="text-foreground whitespace-pre-line leading-relaxed text-sm sm:text-base">{post.content}</p>
        
        {/* Hashtags */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
          {post.hashtags.map((tag) => (
            <span 
              key={tag} 
              className="text-primary hover:text-primary/80 cursor-pointer text-xs sm:text-sm font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Location */}
        {post.location && (
          <div className="flex items-center gap-1 mt-2 text-xs sm:text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{post.location}</span>
          </div>
        )}
      </div>

      {/* Images */}
      {post.images.length > 0 && (
        <div className="relative group">
          <div className="aspect-[4/3] overflow-hidden">
            <img 
              src={post.images[currentImageIndex]} 
              alt="Post image"
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Download button */}
          <button
            onClick={async () => {
              try {
                const response = await fetch(post.images[currentImageIndex]);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `image_${currentImageIndex + 1}.jpg`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('Đã tải ảnh về thiết bị!');
              } catch (error) {
                toast.error('Có lỗi khi tải ảnh');
              }
            }}
            className="absolute top-3 left-3 w-9 h-9 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
            title="Tải ảnh về"
          >
            <Download className="w-4 h-4 text-foreground" />
          </button>
          
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

      {/* Product Post Card - FUN FARM Marketplace */}
      {post.is_product_post && post.product_name && (
        <div className="px-4">
          <ProductPostCard
            productName={post.product_name}
            priceCamly={post.price_camly}
            priceVnd={post.price_vnd}
            quantityKg={post.quantity_kg}
            locationAddress={post.location_address}
            locationLat={post.location_lat}
            locationLng={post.location_lng}
            deliveryOptions={post.delivery_options}
            commitments={post.commitments}
            onBuyClick={() => {
              if (!user) {
                toast.error("Vui lòng đăng nhập để mua hàng");
                return;
              }
              if (user.id === post.author.id) {
                toast.error("Bạn không thể mua sản phẩm của chính mình");
                return;
              }
              setShowBuyModal(true);
            }}
          />
          
          {/* Buy Product Modal */}
          <BuyProductModal
            open={showBuyModal}
            onOpenChange={setShowBuyModal}
            postId={post.id}
            sellerId={post.author.id}
            productName={post.product_name}
            priceCamly={post.price_camly || 0}
            priceVnd={post.price_vnd}
            maxQuantity={post.quantity_kg || 0}
            deliveryOptions={post.delivery_options || ["self_pickup"]}
            locationAddress={post.location_address}
          />
        </div>
      )}

      {/* Legacy Product Card - for old posts */}
      {post.product && !post.is_product_post && (
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
            className="gap-2"
            onClick={handleShareClick}
          >
            <Share2 className="w-5 h-5" />
            <span>{formatNumber(shares)}</span>
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

      {/* Bonus Request Button - for quality posts owned by current user */}
      {isOwner && (
        <div className="px-4 pb-3">
          <BonusRequestButton
            postId={post.id}
            userId={user?.id || ''}
            hasLocation={!!(post.location || post.location_address)}
            hasImages={post.images.length > 0}
            hasContent={post.content.length > 50}
          />
        </div>
      )}

      {/* Comments Section */}
      <CommentSection postId={post.id} isOpen={showComments} />

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        post={post}
        onUpdate={(updatedPost) => {
          setPost(prev => ({
            ...prev,
            content: updatedPost.content,
            images: updatedPost.images || [],
            location: updatedPost.location || "",
            hashtags: updatedPost.hashtags || [],
          }));
        }}
      />

      {/* Share Confirmation Dialog */}
      <AlertDialog open={showShareConfirm} onOpenChange={setShowShareConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl">💚 Lan tỏa yêu thương</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              FUN FARM là nơi chia sẻ tình yêu thương chân thành. 
              Mỗi bài viết chỉ nhận phước lành 1 lần duy nhất.
              <br /><br />
              Bạn có muốn chia sẻ bài viết này với tấm lòng yêu thương không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Để sau</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleShareConfirm}
              className="bg-primary hover:bg-primary/90"
            >
              💚 Tôi chia sẻ bằng tình yêu thương
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        postId={post.id}
        reportedUserId={post.author.id}
        reportedUserName={post.author.name}
      />
    </article>
  );
};

export default FeedPost;
