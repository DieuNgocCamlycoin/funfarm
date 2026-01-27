import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FeedPost from '@/components/feed/FeedPost';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import { ProductReviewList } from '@/components/marketplace/ProductReviewList';
import type { Post } from '@/types/feed';

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    if (!postId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch the post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (postError) throw postError;
      
      if (!postData) {
        setError('Bài viết không tồn tại hoặc đã bị xóa');
        setLoading(false);
        return;
      }

      // Fetch author profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, is_verified, profile_type, is_good_heart')
        .eq('id', postData.author_id)
        .maybeSingle();

      // If it's a shared post, fetch original post
      let originalPost = null;
      let originalAuthor = null;
      
      if (postData.original_post_id) {
        const { data: origData } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postData.original_post_id)
          .maybeSingle();
        
        if (origData) {
          originalPost = origData;
          
          const { data: origAuthorData } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, is_verified, profile_type, is_good_heart')
            .eq('id', origData.author_id)
            .maybeSingle();
          
          originalAuthor = origAuthorData;
        }
      }

      // Fetch receiver profile for gift posts
      let receiverProfile = null;
      if (postData.gift_receiver_id) {
        const { data: receiverData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', postData.gift_receiver_id)
          .maybeSingle();
        receiverProfile = receiverData;
      }

      // Transform to Post type
      const transformedPost: Post = {
        id: postData.id,
        author: {
          id: profileData?.id || postData.author_id,
          name: profileData?.display_name || 'Người dùng',
          username: profileData?.display_name || 'user',
          avatar: profileData?.avatar_url || '',
          type: (profileData?.profile_type as any) || 'buyer',
          verified: profileData?.is_verified || false,
          reputationScore: 0,
          location: '',
          followers: 0,
          following: 0,
          isGoodHeart: profileData?.is_good_heart || false,
        },
        content: postData.content || '',
        images: postData.images || [],
        video: postData.video_url || undefined,
        createdAt: postData.created_at,
        likes: postData.likes_count || 0,
        comments: postData.comments_count || 0,
        shares: postData.shares_count || 0,
        saves: 0,
        isLiked: false,
        isSaved: false,
        hashtags: postData.hashtags || [],
        location: postData.location || undefined,
        location_address: postData.location_address || undefined,
        location_lat: postData.location_lat || undefined,
        location_lng: postData.location_lng || undefined,
        is_product_post: postData.is_product_post || false,
        product_name: postData.product_name || undefined,
        price_camly: postData.price_camly || undefined,
        price_vnd: postData.price_vnd || undefined,
        quantity_kg: postData.quantity_kg || undefined,
        commitments: postData.commitments || undefined,
        delivery_options: postData.delivery_options || undefined,
        post_type: (postData.post_type as any) || 'post',
        original_post_id: postData.original_post_id || undefined,
        share_comment: postData.share_comment || undefined,
        gift_receiver_id: postData.gift_receiver_id || undefined,
        sender_wallet: postData.sender_wallet || undefined,
        receiver_wallet: postData.receiver_wallet || undefined,
        receiver_approved: postData.receiver_approved || undefined,
        receiver_name: receiverProfile?.display_name || undefined,
        receiver_avatar: receiverProfile?.avatar_url || undefined,
        original_post: originalPost ? {
          id: originalPost.id,
          author: {
            id: originalAuthor?.id || originalPost.author_id,
            name: originalAuthor?.display_name || 'Người dùng',
            username: originalAuthor?.display_name || 'user',
            avatar: originalAuthor?.avatar_url || '',
            type: (originalAuthor?.profile_type as any) || 'buyer',
            verified: originalAuthor?.is_verified || false,
            reputationScore: 0,
            location: '',
            followers: 0,
            following: 0,
            isGoodHeart: originalAuthor?.is_good_heart || false,
          },
          content: originalPost.content || '',
          images: originalPost.images || [],
          video: originalPost.video_url || undefined,
          createdAt: originalPost.created_at,
          likes: originalPost.likes_count || 0,
          comments: originalPost.comments_count || 0,
          shares: originalPost.shares_count || 0,
          saves: 0,
          isLiked: false,
          isSaved: false,
          hashtags: originalPost.hashtags || [],
          location: originalPost.location || undefined,
          post_type: (originalPost.post_type as any) || 'post',
          is_product_post: originalPost.is_product_post || false,
          product_name: originalPost.product_name || undefined,
          price_camly: originalPost.price_camly || undefined,
          price_vnd: originalPost.price_vnd || undefined,
          quantity_kg: originalPost.quantity_kg || undefined,
          commitments: originalPost.commitments || undefined,
          delivery_options: originalPost.delivery_options || undefined,
          gift_receiver_id: originalPost.gift_receiver_id || undefined,
          sender_wallet: originalPost.sender_wallet || undefined,
          receiver_wallet: originalPost.receiver_wallet || undefined,
          receiver_approved: originalPost.receiver_approved || undefined,
        } : undefined,
      };

      setPost(transformedPost);
      setAuthorProfile(profileData);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError('Không thể tải bài viết');
    } finally {
      setLoading(false);
    }
  };

  const handlePostUpdate = () => {
    fetchPost();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container max-w-2xl mx-auto px-4 pt-20 pb-24">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/')}>
              Về trang chủ
            </Button>
          </div>
        ) : post ? (
          <div className="space-y-6">
            <FeedPost
              post={post}
              onCountsUpdate={handlePostUpdate}
            />
            
            {/* Product Reviews Section - Only for product posts */}
            {post.is_product_post && postId && (
              <ProductReviewList postId={postId} />
            )}
          </div>
        ) : null}
      </main>
      
      <MobileBottomNav />
    </div>
  );
};

export default PostDetail;
