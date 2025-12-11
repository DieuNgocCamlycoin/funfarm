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

  // Fetch posts from database
  const fetchPosts = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      // Fetch posts first
      const {
        data: postsData,
        error: postsError
      } = await supabase.from('posts').select('*').order('created_at', {
        ascending: false
      }).range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);
      if (postsError) throw postsError;
      if (!postsData || postsData.length === 0) {
        if (!append) setPosts([]);
        setHasMore(false);
        return;
      }

      // Get unique author IDs and fetch their public profiles using RPC function
      const authorIds = [...new Set(postsData.map(p => p.author_id))];
      const {
        data: profilesData
      } = await supabase.rpc('get_public_profiles', {
        user_ids: authorIds
      });

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
            following: 0
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
          hashtags: post.hashtags || []
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
    const channel = supabase.channel('feed-posts').on('postgres_changes', {
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
        hashtags: newPost.hashtags || []
      };

      // Add new post to the beginning of the list
      setPosts(prev => {
        // Avoid duplicates
        if (prev.some(p => p.id === transformedPost.id)) return prev;
        return [transformedPost, ...prev];
      });
      toast.success('Có bài viết mới! 🌱', {
        description: `${transformedPost.author.name} vừa đăng bài`
      });
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
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