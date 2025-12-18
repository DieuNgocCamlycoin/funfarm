import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CreatePost from "@/components/feed/CreatePost";
import CreatePostModal from "@/components/feed/CreatePostModal";
import StoryBar from "@/components/feed/StoryBar";
import FloatingCreateButton from "@/components/feed/FloatingCreateButton";
import FeedPost from "@/components/feed/FeedPost";
import FeedSidebar from "@/components/feed/FeedSidebar";
import FeedFilters from "@/components/feed/FeedFilters";
import VerificationNotice from "@/components/VerificationNotice";
import { trendingHashtags, suggestedFarms } from "@/data/mockFeed";
import { Post } from "@/types/feed";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import HonorBoard from "@/components/HonorBoard";
import TopRanking from "@/components/TopRanking";

// Map profile_type to UserType - defined outside component to avoid hook issues
const mapProfileTypeToUserType = (profileType: string): 'farm' | 'fisher' | 'ranch' | 'buyer' | 'restaurant' | 'distributor' | 'shipper' | 'reviewer' => {
  const mapping: Record<string, 'farm' | 'fisher' | 'ranch' | 'buyer' | 'restaurant' | 'distributor' | 'shipper' | 'reviewer'> = {
    'farmer': 'farm',
    'fisher': 'fisher',
    'eater': 'buyer',
    'restaurant': 'restaurant',
    'distributor': 'distributor',
    'shipper': 'shipper'
  };
  return mapping[profileType] || 'farm';
};
const Feed = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const POSTS_PER_PAGE = 10;

  // Fetch posts from database with good heart priority
  const fetchPosts = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      // Use RPC function to get posts with good heart priority
      const { data: postsData, error: postsError } = await supabase
        .rpc('get_feed_posts', {
          p_limit: POSTS_PER_PAGE,
          p_offset: pageNum * POSTS_PER_PAGE
        });

      if (postsError) throw postsError;
      if (!postsData || postsData.length === 0) {
        if (!append) setPosts([]);
        setHasMore(false);
        return;
      }

      // Get unique author IDs and fetch their public profiles using RPC function
      const authorIds = [...new Set(postsData.map((p: any) => p.author_id))];
      const { data: profilesData } = await supabase.rpc('get_public_profiles', {
        user_ids: authorIds
      });

      // Create a map for quick profile lookup
      const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);

      // Transform database posts to Post type
      const transformedPosts: Post[] = await Promise.all(postsData.map(async (post: any) => {
        const profile = profilesMap.get(post.author_id);
        const displayName = profile?.display_name?.trim() || 'Nông dân FUN';
        
        // Fetch original post if this is a share
        let originalPost = undefined;
        if (post.post_type === 'share' && post.original_post_id) {
          const { data: origPost } = await supabase
            .from('posts')
            .select('*')
            .eq('id', post.original_post_id)
            .single();
          
          if (origPost) {
            const { data: origProfile } = await supabase.rpc('get_public_profiles', {
              user_ids: [origPost.author_id]
            });
            const op = origProfile?.[0];
            const opName = op?.display_name?.trim() || 'Nông dân FUN';
            originalPost = {
              id: origPost.id,
              author: {
                id: origPost.author_id,
                name: opName,
                username: opName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''),
                avatar: op?.avatar_url || '/logo_fun_farm_web3.png',
                type: mapProfileTypeToUserType(op?.profile_type || 'farmer'),
                verified: op?.is_verified || false,
                reputationScore: op?.reputation_score || 0,
                location: op?.location || '',
                followers: 0,
                following: 0,
              },
              content: origPost.content || '',
              images: origPost.images || [],
              likes: origPost.likes_count || 0,
              comments: origPost.comments_count || 0,
              shares: origPost.shares_count || 0,
              saves: 0,
              createdAt: origPost.created_at,
              isLiked: false,
              isSaved: false,
              hashtags: origPost.hashtags || [],
              location: origPost.location || undefined,
              is_product_post: origPost.is_product_post,
              product_name: origPost.product_name,
              price_camly: origPost.price_camly,
            };
          }
        }
        
        return {
          id: post.id,
          author: {
            id: post.author_id,
            name: displayName,
            username: displayName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''),
            avatar: profile?.avatar_url || '/logo_fun_farm_web3.png',
            type: mapProfileTypeToUserType(profile?.profile_type || 'farmer'),
            verified: profile?.is_verified || false,
            reputationScore: profile?.reputation_score || 0,
            location: profile?.location || '',
            followers: 0,
            following: 0,
            isGoodHeart: post.author_is_good_heart || false
          },
          content: post.content || '',
          images: post.images || [],
          video: post.video_url || undefined,
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          shares: post.shares_count || 0,
          saves: 0,
          createdAt: post.created_at,
          isLiked: false,
          isSaved: false,
          location: post.location || undefined,
          hashtags: post.hashtags || [],
          // Product post fields
          is_product_post: post.is_product_post || false,
          product_name: post.product_name || undefined,
          price_camly: post.price_camly || undefined,
          price_vnd: post.price_vnd || undefined,
          quantity_kg: post.quantity_kg || undefined,
          location_address: post.location_address || undefined,
          location_lat: post.location_lat || undefined,
          location_lng: post.location_lng || undefined,
          delivery_options: post.delivery_options || [],
          commitments: post.commitments || [],
          // Share post fields
          post_type: post.post_type || 'post',
          original_post_id: post.original_post_id,
          original_post: originalPost,
        };
      }));
      if (append) {
        setPosts(prev => [...prev, ...transformedPosts]);
      } else {
        setPosts(transformedPosts);
      }
      setHasMore(transformedPosts.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Có lỗi khi tải bài viết');
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadInitialPosts = async () => {
      setIsLoading(true);
      await fetchPosts(0);
      setIsLoading(false);
    };
    loadInitialPosts();
  }, [fetchPosts]);

  // Realtime subscription for new posts and share count updates
  useEffect(() => {
    // Channel for new posts (including share posts)
    const postsChannel = supabase.channel('feed-posts').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'posts'
    }, async payload => {
      const newPost = payload.new as any;

      // Fetch the author profile using RPC function
      const {
        data: profilesData
      } = await supabase.rpc('get_public_profiles', {
        user_ids: [newPost.author_id]
      });
      const profile = profilesData?.[0];
      const displayName = profile?.display_name?.trim() || 'Nông dân FUN';
      
      // If this is a share post, fetch the original post
      let originalPost = undefined;
      if (newPost.post_type === 'share' && newPost.original_post_id) {
        const { data: origPost } = await supabase
          .from('posts')
          .select('*')
          .eq('id', newPost.original_post_id)
          .single();
        
        if (origPost) {
          const { data: origProfile } = await supabase.rpc('get_public_profiles', {
            user_ids: [origPost.author_id]
          });
          const op = origProfile?.[0];
          const opName = op?.display_name?.trim() || 'Nông dân FUN';
          originalPost = {
            id: origPost.id,
            author: {
              id: origPost.author_id,
              name: opName,
              username: opName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''),
              avatar: op?.avatar_url || '/logo_fun_farm_web3.png',
              type: mapProfileTypeToUserType(op?.profile_type || 'farmer'),
              verified: op?.is_verified || false,
              reputationScore: op?.reputation_score || 0,
              location: op?.location || '',
              followers: 0,
              following: 0,
            },
            content: origPost.content || '',
            images: origPost.images || [],
            likes: origPost.likes_count || 0,
            comments: origPost.comments_count || 0,
            shares: origPost.shares_count || 0,
            saves: 0,
            createdAt: origPost.created_at,
            isLiked: false,
            isSaved: false,
            hashtags: origPost.hashtags || [],
            location: origPost.location || undefined,
            is_product_post: origPost.is_product_post,
            product_name: origPost.product_name,
            price_camly: origPost.price_camly,
          };
        }
      }
      
      const transformedPost: Post = {
        id: newPost.id,
        author: {
          id: newPost.author_id,
          name: displayName,
          username: displayName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''),
          avatar: profile?.avatar_url || '/logo_fun_farm_web3.png',
          type: mapProfileTypeToUserType(profile?.profile_type || 'farmer'),
          verified: profile?.is_verified || false,
          reputationScore: profile?.reputation_score || 0,
          location: profile?.location || '',
          followers: 0,
          following: 0
        },
        content: newPost.content || '',
        images: newPost.images || [],
        video: newPost.video_url || undefined,
        likes: newPost.likes_count || 0,
        comments: newPost.comments_count || 0,
        shares: newPost.shares_count || 0,
        saves: 0,
        createdAt: newPost.created_at,
        isLiked: false,
        isSaved: false,
        location: newPost.location || undefined,
        hashtags: newPost.hashtags || [],
        // Product post fields
        is_product_post: newPost.is_product_post || false,
        product_name: newPost.product_name || undefined,
        price_camly: newPost.price_camly || undefined,
        price_vnd: newPost.price_vnd || undefined,
        quantity_kg: newPost.quantity_kg || undefined,
        location_address: newPost.location_address || undefined,
        location_lat: newPost.location_lat || undefined,
        location_lng: newPost.location_lng || undefined,
        delivery_options: newPost.delivery_options || [],
        commitments: newPost.commitments || [],
        // Share post fields
        post_type: newPost.post_type || 'post',
        original_post_id: newPost.original_post_id,
        original_post: originalPost,
      };

      // Add new post to the beginning of the list
      setPosts(prev => {
        // Avoid duplicates
        if (prev.some(p => p.id === transformedPost.id)) return prev;
        return [transformedPost, ...prev];
      });
      
      const toastMessage = newPost.post_type === 'share' 
        ? `${transformedPost.author.name} vừa chia sẻ bài viết`
        : `${transformedPost.author.name} vừa đăng bài`;
      toast.success('Có bài viết mới! 🌱', {
        description: toastMessage
      });
    }).subscribe();

    // Channel for share count updates (when someone shares a post)
    const sharesChannel = supabase.channel('feed-shares').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'posts'
    }, payload => {
      const updatedPost = payload.new as any;
      // Update the counts for the post in our list
      setPosts(prev => prev.map(p => {
        if (p.id === updatedPost.id) {
          return { 
            ...p, 
            likes: updatedPost.likes_count,
            comments: updatedPost.comments_count,
            shares: updatedPost.shares_count 
          };
        }
        // Also update if this post's original_post matches
        if (p.original_post && p.original_post.id === updatedPost.id) {
          return {
            ...p,
            original_post: { 
              ...p.original_post, 
              likes: updatedPost.likes_count,
              comments: updatedPost.comments_count,
              shares: updatedPost.shares_count 
            }
          };
        }
        return p;
      }));
    }).subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(sharesChannel);
    };
  }, []);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500) {
      if (!isLoadingMore && hasMore && !isLoading) {
        loadMorePosts();
      }
    }
  }, [isLoadingMore, hasMore, isLoading]);
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);
  const loadMorePosts = async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    await fetchPosts(nextPage, true);
    setPage(nextPage);
    setIsLoadingMore(false);
  };
  const handleNewPost = async () => {
    // Refetch posts to get the latest
    setPage(0);
    await fetchPosts(0);
  };
  return <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-20 pb-16">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="rounded-2xl p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Feed */}
              <div className="lg:col-span-2 space-y-6">
                {/* Page Title */}
                <div className="flex items-center justify-between">
                  <div>
                    
                    
                  </div>
                </div>

                {/* Verification Notice */}
                <VerificationNotice 
                  onConnectWallet={() => {
                    window.location.href = '/reward';
                  }}
                  showDismiss
                />

                {/* Create Post Box - Facebook style */}
                <CreatePost onOpenModal={() => setIsCreateModalOpen(true)} />

                {/* Mobile Honor Board & Top Ranking */}
                <div className="lg:hidden space-y-4">
                  <HonorBoard compact />
                  <TopRanking compact />
                </div>

                {/* Story Bar */}
                <StoryBar />

                {/* Filters */}
                <FeedFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />

                {/* Posts */}
                {isLoading ? <div className="flex justify-center py-12">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span>Đang tải bài viết...</span>
                    </div>
                  </div> : posts.length === 0 ? <div className="text-center py-12 bg-card rounded-xl border border-border">
                    <p className="text-lg text-muted-foreground">🌱 Chưa có bài viết nào!</p>
                    <p className="text-sm mt-1 text-muted-foreground">Hãy là người đầu tiên chia sẻ câu chuyện của bạn</p>
                  </div> : <div className="space-y-6">
                    {posts.map(post => <FeedPost key={post.id} post={post} />)}
                  </div>}

                {/* Loading indicator */}
                {isLoadingMore && <div className="flex justify-center py-8">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span>Đang tải thêm...</span>
                    </div>
                  </div>}

                {/* End of feed */}
                {!hasMore && posts.length > 0 && <div className="text-center py-8 text-muted-foreground">
                    <p className="text-lg">🌱 Bạn đã xem hết bảng tin rồi!</p>
                    <p className="text-sm mt-1">Quay lại sau để xem thêm bài mới nhé</p>
                  </div>}
              </div>

              {/* Sidebar - Scrollable */}
              <div className="hidden lg:block">
                <div 
                  className="sticky top-24 overflow-y-auto scrollbar-thin pr-2"
                  style={{
                    maxHeight: 'calc(100vh - 120px)',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255, 215, 0, 0.5) transparent',
                  }}
                >
                  <FeedSidebar trendingHashtags={trendingHashtags} suggestedFarms={suggestedFarms} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Floating Create Button (Mobile only) */}
      <div className="lg:hidden">
        <FloatingCreateButton onClick={() => setIsCreateModalOpen(true)} />
      </div>

      {/* Create Post Modal */}
      <CreatePostModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onPost={handleNewPost} />
    </div>;
};
export default Feed;