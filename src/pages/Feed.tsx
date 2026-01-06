// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Footer from "@/components/Footer";
import CreatePost from "@/components/feed/CreatePost";
import CreatePostModal from "@/components/feed/CreatePostModal";
import StoryBar from "@/components/feed/StoryBar";
import { useAngel } from "@/components/angel/AngelContext";
import FeedPost from "@/components/feed/FeedPost";
import FeedSidebar from "@/components/feed/FeedSidebar";
import EcosystemSidebar from "@/components/feed/EcosystemSidebar";
import FeedFilters from "@/components/feed/FeedFilters";

import { ViolationWarning } from "@/components/ViolationWarning";
import { trendingHashtags, suggestedFarms } from "@/data/mockFeed";
import { Post } from "@/types/feed";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import HonorBoard from "@/components/HonorBoard";
import TopRanking from "@/components/TopRanking";
import { useAuth } from "@/hooks/useAuth";

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
  const { profile } = useAuth();
  const { setOnCreatePost } = useAngel();
  const [activeFilter, setActiveFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const POSTS_PER_PAGE = 10;

  // Register create post callback for Angel Speed Dial
  useEffect(() => {
    if (!profile?.banned) {
      setOnCreatePost(() => () => setIsCreateModalOpen(true));
    }
    return () => setOnCreatePost(null);
  }, [setOnCreatePost, profile?.banned]);

  const extractGiftReceiverName = (content: string | null | undefined) => {
    if (!content) return undefined;

    // New format: "... @ReceiverName vừa được ..."
    const m1 = content.match(/@([^@\n]+?)\s+vừa được/i);
    if (m1?.[1]) return m1[1].trim();

    // Older format: "Đã tặng ... cho @ReceiverName"
    const m2 = content.match(/cho\s+@([^\n#\[]+)/i);
    if (m2?.[1]) return m2[1].trim();

    return undefined;
  };

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

      // Get unique author IDs
      const authorIds = [...new Set(postsData.map((p: any) => p.author_id))];
      const { data: profilesDataRaw } = await supabase.rpc('get_public_profiles', {
        user_ids: authorIds
      });
      const profilesData = (profilesDataRaw || []) as any[];

      // Gift receiver profiles (batch)
      const receiverIds = [...new Set(
        postsData
          .filter((p: any) => p.post_type === 'gift' && p.gift_receiver_id)
          .map((p: any) => p.gift_receiver_id)
      )];

      const receiverProfilesData: any[] = receiverIds.length
        ? (((await supabase.rpc('get_public_profiles', { user_ids: receiverIds })).data as any[]) || [])
        : [];

      // Gift transaction amounts (batch) - source of truth from wallet_transactions
      const giftPostIds = [...new Set(
        postsData
          .filter((p: any) => p.post_type === 'gift')
          .map((p: any) => p.id)
      )];

      const giftTxMap = new Map<string, { amount: number; currency: string }>();
      if (giftPostIds.length) {
        const { data: txRows } = await supabase
          .from('wallet_transactions')
          .select('post_id, amount, currency')
          .in('post_id', giftPostIds);

        (txRows || []).forEach((r: any) => {
          if (!r?.post_id) return;
          giftTxMap.set(r.post_id, {
            amount: Number(r.amount) || 0,
            currency: r.currency || 'CAMLY',
          });
        });
      }

      // Create maps for quick profile lookup
      const profilesMap = new Map<string, any>(profilesData.map((p: any) => [p.id, p] as [string, any]));
      const receiverMap = new Map<string, any>(receiverProfilesData.map((p: any) => [p.id, p] as [string, any]));

      // Fallback cache: receiverName -> profile (for older gift posts missing gift_receiver_id)
      const receiverNameCache = new Map<string, { display_name?: string; avatar_url?: string }>();

      // Transform amalgamated database posts to Post type
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

            // If original is a gift post, enrich receiver + amount so SharedPostCard can render the gift card
            let origReceiverName: string | undefined;
            let origReceiverAvatar: string | undefined;
            let origGiftAmount: number | undefined;
            let origGiftCurrency: string | undefined;

            if (origPost.post_type === 'gift') {
              if (origPost.gift_receiver_id) {
                const { data: rp } = await supabase.rpc('get_public_profiles', {
                  user_ids: [origPost.gift_receiver_id]
                });
                const r0: any = rp?.[0];
                origReceiverName = r0?.display_name?.trim() || undefined;
                origReceiverAvatar = r0?.avatar_url || undefined;
              }

              const { data: tx } = await supabase
                .from('wallet_transactions')
                .select('amount, currency')
                .eq('post_id', origPost.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (tx) {
                origGiftAmount = Number((tx as any).amount) || 0;
                origGiftCurrency = (tx as any).currency || undefined;
              }
            }

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
              // IMPORTANT: keep original post_type so SharedPostCard can decide gift vs normal
              post_type: origPost.post_type || 'post',
              // Gift fields if applicable
              gift_receiver_id: origPost.gift_receiver_id,
              sender_wallet: origPost.sender_wallet,
              receiver_wallet: origPost.receiver_wallet,
              receiver_name: origReceiverName,
              receiver_avatar: origReceiverAvatar,
              gift_amount: origGiftAmount,
              gift_currency: origGiftCurrency,
            };
          }
        }

        // Receiver info for gift posts
        let receiverName: string | undefined = undefined;
        let receiverAvatar: string | undefined = undefined;

        if (post.post_type === 'gift') {
          // Primary path: receiver id exists
          const receiverProfile = post.gift_receiver_id
            ? receiverMap.get(post.gift_receiver_id)
            : undefined;

          receiverName = receiverProfile?.display_name?.trim() || undefined;
          receiverAvatar = receiverProfile?.avatar_url || undefined;

          // Fallback path: older gift posts were created without gift_receiver_id
          if (!receiverName) {
            const extractedName = extractGiftReceiverName(post.content);
            if (extractedName) {
              receiverName = extractedName;

              const cached = receiverNameCache.get(extractedName);
              if (cached) {
                receiverAvatar = cached.avatar_url;
              } else {
                const { data: foundProfiles } = await supabase
                  .from('profiles')
                  .select('display_name, avatar_url')
                  .ilike('display_name', extractedName)
                  .limit(1);

                const fp: any = (foundProfiles || [])[0];
                receiverAvatar = fp?.avatar_url || receiverAvatar;
                receiverNameCache.set(extractedName, {
                  display_name: fp?.display_name,
                  avatar_url: fp?.avatar_url,
                });
              }
            }
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
          // Gift post fields
          gift_receiver_id: post.gift_receiver_id,
          receiver_approved: post.receiver_approved,
          sender_wallet: post.sender_wallet,
          receiver_wallet: post.receiver_wallet,
          receiver_name: receiverName,
          receiver_avatar: receiverAvatar,
          gift_amount: giftTxMap.get(post.id)?.amount,
          gift_currency: giftTxMap.get(post.id)?.currency,
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
      
      // If this is a share post, fetch the original post with full gift data
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
          
          // If original is a gift post, enrich receiver + amount
          let origReceiverName: string | undefined;
          let origReceiverAvatar: string | undefined;
          let origGiftAmount: number | undefined;
          let origGiftCurrency: string | undefined;

          if (origPost.post_type === 'gift') {
            // Fetch receiver profile
            if (origPost.gift_receiver_id) {
              const { data: rp } = await supabase.rpc('get_public_profiles', {
                user_ids: [origPost.gift_receiver_id]
              });
              const r0: any = rp?.[0];
              origReceiverName = r0?.display_name?.trim() || undefined;
              origReceiverAvatar = r0?.avatar_url || undefined;
            }

            // Fallback: parse from content
            if (!origReceiverName) {
              const extractedName = extractGiftReceiverName(origPost.content);
              if (extractedName) {
                origReceiverName = extractedName;
                const { data: foundProfiles } = await supabase
                  .from('profiles')
                  .select('display_name, avatar_url')
                  .ilike('display_name', extractedName)
                  .limit(1);
                const fp: any = (foundProfiles || [])[0];
                origReceiverAvatar = fp?.avatar_url || undefined;
              }
            }

            // Fetch gift amount from wallet_transactions
            const { data: tx } = await supabase
              .from('wallet_transactions')
              .select('amount, currency')
              .eq('post_id', origPost.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (tx) {
              origGiftAmount = Number((tx as any).amount) || 0;
              origGiftCurrency = (tx as any).currency || 'CAMLY';
            }
          }
          
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
            // Gift post fields
            post_type: origPost.post_type || 'post',
            gift_receiver_id: origPost.gift_receiver_id,
            sender_wallet: origPost.sender_wallet,
            receiver_wallet: origPost.receiver_wallet,
            receiver_name: origReceiverName,
            receiver_avatar: origReceiverAvatar,
            gift_amount: origGiftAmount,
            gift_currency: origGiftCurrency,
          };
        }
      }
      // Receiver info for gift posts (so the card shows đúng tên/avatar ngay lập tức)
      let receiverName: string | undefined = undefined;
      let receiverAvatar: string | undefined = undefined;
      if (newPost.post_type === 'gift') {
        if (newPost.gift_receiver_id) {
          const { data: receiverProfiles } = await supabase.rpc('get_public_profiles', {
            user_ids: [newPost.gift_receiver_id]
          });
          const rp: any = receiverProfiles?.[0];
          receiverName = rp?.display_name?.trim() || undefined;
          receiverAvatar = rp?.avatar_url || undefined;
        }

        // Fallback for older/new malformed gift posts without receiver id
        if (!receiverName) {
          const extractedName = extractGiftReceiverName(newPost.content);
          if (extractedName) {
            receiverName = extractedName;
            const { data: foundProfiles } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .ilike('display_name', extractedName)
              .limit(1);
            const fp: any = (foundProfiles || [])[0];
            receiverAvatar = fp?.avatar_url || receiverAvatar;
          }
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
        // Gift post fields
        gift_receiver_id: newPost.gift_receiver_id,
        receiver_approved: newPost.receiver_approved,
        sender_wallet: newPost.sender_wallet,
        receiver_wallet: newPost.receiver_wallet,
        receiver_name: receiverName,
        receiver_avatar: receiverAvatar,
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
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-20 pb-16">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="rounded-2xl p-4 lg:p-6">
            {/* 3-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Sidebar - Ecosystem */}
              <div className="hidden lg:block lg:col-span-3">
                <EcosystemSidebar />
              </div>

              {/* Main Feed */}
              <div className="lg:col-span-6 space-y-6">
                {/* Banned Warning */}
                {profile?.banned && (
                  <ViolationWarning 
                    level={3} 
                    banned={true} 
                    banReason={profile.ban_reason || undefined}
                  />
                )}

                {/* Create Post Box - Facebook style - Hide if banned */}
                {!profile?.banned && (
                  <CreatePost onOpenModal={() => setIsCreateModalOpen(true)} />
                )}

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
                    {posts.map(post => <FeedPost key={post.id} post={post} />)}
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

              {/* Right Sidebar - Honor Board & Rankings */}
              <div className="hidden lg:block lg:col-span-3">
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

      {/* Create Post Modal - Hide if banned */}
      {!profile?.banned && (
        <CreatePostModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onPost={handleNewPost} />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default Feed;