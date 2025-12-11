import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CreatePost from "@/components/feed/CreatePost";
import CreatePostModal from "@/components/feed/CreatePostModal";
import StoryBar from "@/components/feed/StoryBar";
import FloatingCreateButton from "@/components/feed/FloatingCreateButton";
import FeedPost from "@/components/feed/FeedPost";
import FeedSidebar from "@/components/feed/FeedSidebar";
import FeedFilters from "@/components/feed/FeedFilters";
import { trendingHashtags, suggestedFarms } from "@/data/mockFeed";
import { Post } from "@/types/feed";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Map profile_type to UserType - defined outside component to avoid hook issues
const mapProfileTypeToUserType = (profileType: string): 'farm' | 'fisher' | 'ranch' | 'buyer' | 'restaurant' | 'distributor' | 'shipper' | 'reviewer' => {
  const mapping: Record<string, 'farm' | 'fisher' | 'ranch' | 'buyer' | 'restaurant' | 'distributor' | 'shipper' | 'reviewer'> = {
    'farmer': 'farm',
    'fisher': 'fisher',
    'eater': 'buyer',
    'restaurant': 'restaurant',
    'distributor': 'distributor',
    'shipper': 'shipper',
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

  // Fetch posts from database
  const fetchPosts = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      // Fetch posts first
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        if (!append) setPosts([]);
        setHasMore(false);
        return;
      }

      // Get unique author IDs and fetch their public profiles using RPC function
      const authorIds = [...new Set(postsData.map(p => p.author_id))];
      const { data: profilesData } = await supabase
        .rpc('get_public_profiles', { user_ids: authorIds });

      // Create a map for quick profile lookup
      const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);

      // Transform database posts to Post type
      const transformedPosts: Post[] = postsData.map((post: any) => {
        const profile = profilesMap.get(post.author_id);
        const displayName = profile?.display_name?.trim() || 'Nông dân FUN';
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
        };
      });

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

  // Realtime subscription for new posts
  useEffect(() => {
    const channel = supabase
      .channel('feed-posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        async (payload) => {
          const newPost = payload.new as any;
          
          // Fetch the author profile using RPC function
          const { data: profilesData } = await supabase
            .rpc('get_public_profiles', { user_ids: [newPost.author_id] });
          const profile = profilesData?.[0];

          const displayName = profile?.display_name?.trim() || 'Nông dân FUN';
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
              following: 0,
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
          };

          // Add new post to the beginning of the list
          setPosts(prev => {
            // Avoid duplicates
            if (prev.some(p => p.id === transformedPost.id)) return prev;
            return [transformedPost, ...prev];
          });

          toast.success('Có bài viết mới! 🌱', {
            description: `${transformedPost.author.name} vừa đăng bài`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 500
    ) {
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

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-20 pb-16">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="bg-white/94 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Feed */}
              <div className="lg:col-span-2 space-y-6">
                {/* Page Title */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">
                      Trang Chủ
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      Khám phá sản phẩm tươi ngon từ nông trại & biển cả
                    </p>
                  </div>
                </div>

                {/* Create Post Box - Facebook style */}
                <CreatePost onOpenModal={() => setIsCreateModalOpen(true)} />

                {/* Story Bar */}
                <StoryBar />

                {/* Filters */}
                <FeedFilters 
                  activeFilter={activeFilter} 
                  onFilterChange={setActiveFilter} 
                />

                {/* Posts */}
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span>Đang tải bài viết...</span>
                    </div>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-xl border border-border">
                    <p className="text-lg text-muted-foreground">🌱 Chưa có bài viết nào!</p>
                    <p className="text-sm mt-1 text-muted-foreground">Hãy là người đầu tiên chia sẻ câu chuyện của bạn</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {posts.map((post) => (
                      <FeedPost key={post.id} post={post} />
                    ))}
                  </div>
                )}

                {/* Loading indicator */}
                {isLoadingMore && (
                  <div className="flex justify-center py-8">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span>Đang tải thêm...</span>
                    </div>
                  </div>
                )}

                {/* End of feed */}
                {!hasMore && posts.length > 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-lg">🌱 Bạn đã xem hết bảng tin rồi!</p>
                    <p className="text-sm mt-1">Quay lại sau để xem thêm bài mới nhé</p>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="hidden lg:block">
                <div className="sticky top-24">
                  <FeedSidebar 
                    trendingHashtags={trendingHashtags}
                    suggestedFarms={suggestedFarms}
                  />
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
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPost={handleNewPost}
      />
    </div>
  );
};

export default Feed;