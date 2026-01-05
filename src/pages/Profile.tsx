// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Footer from "@/components/Footer";
import FeedPost from "@/components/feed/FeedPost";
import { ProfileCreatePost } from "@/components/profile/ProfileCreatePost";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoodHeartBadge } from "@/components/GoodHeartBadge";
import { ViolationWarning } from "@/components/ViolationWarning";

import HonorBoard from "@/components/HonorBoard";
import ProfileHonorBoard from "@/components/profile/ProfileHonorBoard";
import { 
  MapPin, 
  Calendar, 
  Edit, 
  Settings,
  Grid3X3,
  User,
  Users,
  Image as ImageIcon,
  Gift,
  BadgeCheck,
  Wallet,
  Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ImageCropUpload } from "@/components/profile/ImageCropUpload";
import { CoverPhotoEditor } from "@/components/profile/CoverPhotoEditor";
import { FriendRequests } from "@/components/FriendRequests";
import { FriendsList } from "@/components/FriendsList";
import { FriendSearch } from "@/components/FriendSearch";

const profileTypeLabels: Record<string, { emoji: string; label: string }> = {
  farmer: { emoji: '🧑‍🌾', label: 'Nông dân' },
  fisher: { emoji: '🎣', label: 'Ngư dân' },
  eater: { emoji: '🍽️', label: 'Người ăn sạch' },
  restaurant: { emoji: '👨‍🍳', label: 'Nhà hàng' },
  distributor: { emoji: '📦', label: 'Nhà phân phối' },
  shipper: { emoji: '🚚', label: 'Shipper' },
};

interface Post {
  id: string;
  content: string;
  images: string[] | null;
  video_url: string | null;
  post_type: string;
  location: string | null;
  hashtags: string[] | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  author_id: string;
  original_post_id?: string | null;
  share_comment?: string | null;
  original_post?: any;
  // Gift post fields
  gift_receiver_id?: string | null;
  sender_wallet?: string | null;
  receiver_wallet?: string | null;
  receiver_approved?: boolean | null;
  receiver_name?: string;
  receiver_avatar?: string;
  gift_amount?: number;
  gift_currency?: string;
}

interface Stats {
  postsCount: number;
  friendsCount: number;
}

const Profile = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats>({ postsCount: 0, friendsCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [banInfo, setBanInfo] = useState<{ expires_at: string; reason: string } | null>(null);

  const roleInfo = profileTypeLabels[profile?.profile_type || 'farmer'];
  const violationLevel = (profile as any)?.violation_level || 0;

  // Fetch real stats and posts
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Fetch user's posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;
        
        // Helper to extract receiver name from gift post content
        const extractGiftReceiverName = (content: string | null | undefined) => {
          if (!content) return undefined;
          const m1 = content.match(/@([^@\n]+?)\s+vừa được/i);
          if (m1?.[1]) return m1[1].trim();
          const m2 = content.match(/cho\s+@([^\n#\[]+)/i);
          if (m2?.[1]) return m2[1].trim();
          return undefined;
        };

        // Collect all gift receiver IDs for batch fetching
        const giftReceiverIds = [...new Set(
          (postsData || [])
            .filter(p => p.post_type === 'gift' && p.gift_receiver_id)
            .map(p => p.gift_receiver_id)
        )];

        const receiverProfilesData: any[] = giftReceiverIds.length
          ? (((await supabase.rpc('get_public_profiles', { user_ids: giftReceiverIds })).data as any[]) || [])
          : [];

        const receiverMap = new Map<string, any>(receiverProfilesData.map(p => [p.id, p]));

        // Gift transaction amounts (batch) - source of truth from wallet_transactions
        const giftPostIds = [...new Set(
          (postsData || [])
            .filter(p => p.post_type === 'gift')
            .map(p => p.id)
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
        
        // For share posts, fetch original post data; for gift posts, resolve receiver info
        const postsWithOriginal = await Promise.all((postsData || []).map(async (post) => {
          let updatedPost: Post = { ...post };

          // Handle share posts
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

              const original: any = {
                ...origPost,
                author: {
                  id: origPost.author_id,
                  display_name: op?.display_name || 'Nông dân FUN',
                  avatar_url: op?.avatar_url,
                  profile_type: op?.profile_type || 'farmer',
                  is_verified: op?.is_verified || false,
                  reputation_score: op?.reputation_score || 0,
                  location: op?.location,
                  is_good_heart: false,
                }
              };

              // If original is gift, attach receiver + amount so SharedPostCard renders correctly
              if (origPost.post_type === 'gift') {
                if (origPost.gift_receiver_id) {
                  const { data: rp } = await supabase.rpc('get_public_profiles', {
                    user_ids: [origPost.gift_receiver_id]
                  });
                  const r0: any = rp?.[0];
                  original.receiver_name = r0?.display_name?.trim() || undefined;
                  original.receiver_avatar = r0?.avatar_url || undefined;
                }

                const { data: tx } = await supabase
                  .from('wallet_transactions')
                  .select('amount, currency')
                  .eq('post_id', origPost.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (tx) {
                  original.gift_amount = Number((tx as any).amount) || 0;
                  original.gift_currency = (tx as any).currency || undefined;
                }
              }

              updatedPost.original_post = original;
            }
          }

          // Handle gift posts - resolve receiver info
          if (post.post_type === 'gift') {
            let receiverName: string | undefined = undefined;
            let receiverAvatar: string | undefined = undefined;

            if (post.gift_receiver_id) {
              const receiverProfile = receiverMap.get(post.gift_receiver_id);
              receiverName = receiverProfile?.display_name?.trim() || undefined;
              receiverAvatar = receiverProfile?.avatar_url || undefined;
            }

            // Fallback: parse from content
            if (!receiverName) {
              const extractedName = extractGiftReceiverName(post.content);
              if (extractedName) {
                receiverName = extractedName;
                const { data: foundProfiles } = await supabase
                  .from('profiles')
                  .select('display_name, avatar_url')
                  .ilike('display_name', extractedName)
                  .limit(1);
                const fp: any = (foundProfiles || [])[0];
                receiverAvatar = fp?.avatar_url || undefined;
              }
            }

            updatedPost.receiver_name = receiverName;
            updatedPost.receiver_avatar = receiverAvatar;
            updatedPost.gift_amount = giftTxMap.get(post.id)?.amount;
            updatedPost.gift_currency = giftTxMap.get(post.id)?.currency;
          }

          return updatedPost;
        }));
        
        setPosts(postsWithOriginal);

        // Fetch friends count (accepted friendships)
        const { count: friendsAsFollower } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id)
          .eq('status', 'accepted');

        const { count: friendsAsFollowing } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.id)
          .eq('status', 'accepted');

        setStats({
          postsCount: postsData?.length || 0,
          friendsCount: (friendsAsFollower || 0) + (friendsAsFollowing || 0),
        });

        // Fetch cover_url from profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('cover_url')
          .eq('id', user.id)
          .single();
        
        if (profileData?.cover_url) {
          setCoverUrl(profileData.cover_url);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Fetch ban info if any
    const fetchBanInfo = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('reward_bans')
        .select('expires_at, reason')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (data) {
        setBanInfo(data);
      }
    };
    fetchBanInfo();
  }, [user?.id]);

  // Update avatar when profile changes
  useEffect(() => {
    setAvatarUrl(profile?.avatar_url);
  }, [profile?.avatar_url]);

  const handleAvatarUpload = (url: string) => {
    setAvatarUrl(url);
    refreshProfile();
  };

  const handleCoverUpload = (url: string) => {
    setCoverUrl(url);
  };

  // Real-time subscription for post updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel('profile-posts-updates').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'posts',
    }, payload => {
      const updatedPost = payload.new as any;
      // Only update if this is our post
      if (updatedPost.author_id === user.id) {
        setPosts(prev => prev.map(p => 
          p.id === updatedPost.id 
            ? { ...p, likes_count: updatedPost.likes_count, comments_count: updatedPost.comments_count, shares_count: updatedPost.shares_count }
            : p
        ));
      }
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Refresh posts after creating a new one
  const handlePostCreated = useCallback(async () => {
    if (!user?.id) return;
    
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });

    if (postsData) {
      setPosts(postsData);
      setStats(prev => ({ ...prev, postsCount: postsData.length }));
    }
  }, [user?.id]);

  // Helper function to map profile type
  const mapProfileTypeToUserType = (profileType: string) => {
    const typeMap: Record<string, string> = {
      farmer: 'farm',
      fisher: 'fisher',
      eater: 'farm',
      restaurant: 'restaurant',
      distributor: 'distributor',
      shipper: 'farm',
    };
    return typeMap[profileType] || 'farm';
  };

  // Transform posts for FeedPost component
  const transformedPosts = posts.map(post => {
    // Transform original_post if it's a share
    let originalPost = undefined;
    if (post.post_type === 'share' && post.original_post) {
      const op = post.original_post;
      const opAuthor = op.author;
      originalPost = {
        id: op.id,
        author: {
          id: opAuthor.id,
          name: opAuthor.display_name || 'Nông dân FUN',
          username: (opAuthor.display_name || 'funfarmer').toLowerCase().replace(/\s+/g, ''),
          avatar: opAuthor.avatar_url || '/logo_fun_farm_web3.png',
          type: mapProfileTypeToUserType(opAuthor.profile_type || 'farmer') as any,
          verified: opAuthor.is_verified || false,
          reputationScore: opAuthor.reputation_score || 0,
          location: opAuthor.location || '',
          followers: 0,
          following: 0,
          isGoodHeart: opAuthor.is_good_heart || false,
        },
        content: op.content || '',
        images: op.images || [],
        likes: op.likes_count || 0,
        comments: op.comments_count || 0,
        shares: op.shares_count || 0,
        saves: 0,
        createdAt: op.created_at,
        isLiked: false,
        isSaved: false,
        hashtags: op.hashtags || [],
        location: op.location || undefined,
        is_product_post: op.is_product_post,
        product_name: op.product_name,
        price_camly: op.price_camly,
        post_type: op.post_type || 'post',
        gift_receiver_id: op.gift_receiver_id,
        sender_wallet: op.sender_wallet,
        receiver_wallet: op.receiver_wallet,
        receiver_name: op.receiver_name,
        receiver_avatar: op.receiver_avatar,
        gift_amount: op.gift_amount,
        gift_currency: op.gift_currency,
      };
    }

    return {
      id: post.id,
      author: {
        id: user?.id || '',
        name: profile?.display_name || 'FUN Farmer',
        username: profile?.display_name || 'funfarmer',
        avatar: avatarUrl || '',
        type: 'farm' as const,
        verified: profile?.is_verified || false,
        reputationScore: profile?.reputation_score || 0,
        location: profile?.location || '',
        followers: stats.friendsCount,
        following: stats.friendsCount,
        isGoodHeart: (profile as any)?.is_good_heart || false,
      },
      content: post.content || '',
      images: post.images || [],
      video: post.video_url || undefined,
      likes: post.likes_count,
      comments: post.comments_count,
      shares: post.shares_count,
      saves: 0,
      createdAt: post.created_at,
      isLiked: false,
      isSaved: false,
      location: post.location || undefined,
      hashtags: post.hashtags || [],
      post_type: post.post_type as 'post' | 'share' | 'gift',
      original_post_id: post.original_post_id || undefined,
      share_comment: post.share_comment || undefined,
      original_post: originalPost,
      // Gift post fields
      gift_receiver_id: post.gift_receiver_id || undefined,
      sender_wallet: post.sender_wallet || undefined,
      receiver_wallet: post.receiver_wallet || undefined,
      receiver_approved: post.receiver_approved || undefined,
      receiver_name: post.receiver_name,
      receiver_avatar: post.receiver_avatar,
      gift_amount: (post as any).gift_amount,
      gift_currency: (post as any).gift_currency,
    };
  });

  const totalCamly = (profile?.camly_balance || 0) + (profile?.pending_reward || 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">

        {/* Violation Warning */}
        {violationLevel > 0 && (
          <div className="container max-w-5xl mx-auto px-4 pt-4">
            <ViolationWarning 
              level={violationLevel} 
              expiresAt={banInfo?.expires_at} 
              reason={banInfo?.reason} 
            />
          </div>
        )}
        {/* Cover Photo - Facebook Style với chiều cao lớn hơn */}
        <div className="relative h-64 md:h-80 lg:h-96 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30 overflow-hidden">
          {coverUrl ? (
            <img 
              src={coverUrl.split('?')[0]} 
              alt="Cover" 
              className="absolute w-full h-auto min-h-full object-cover"
              style={{
                top: '50%',
                transform: `translateY(-${(() => {
                  const match = coverUrl.match(/pos=(\d+(?:\.\d+)?)/);
                  return match ? parseFloat(match[1]) : 50;
                })()}%)`,
              }}
            />
          ) : (
            <img 
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=400&fit=crop" 
              alt="Default cover" 
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
          
          {/* Profile Honor Board - Right half of cover */}
          <div className="absolute top-4 right-4 bottom-4 hidden md:flex items-center justify-center z-40 w-1/2">
            <ProfileHonorBoard 
              userId={user?.id || ''} 
              displayName={profile?.display_name || null} 
              avatarUrl={avatarUrl || null} 
            />
          </div>
          
          {/* Cover Photo Editor Button */}
          {user?.id && (
            <div className="absolute bottom-4 right-4 z-50">
              <CoverPhotoEditor 
                currentImage={coverUrl} 
                userId={user.id} 
                onUploadComplete={handleCoverUpload} 
              />
            </div>
          )}
        </div>

        {/* Profile Info Section */}
        <div className="container max-w-5xl mx-auto px-4">
          <div className="relative -mt-16 md:-mt-20">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background shadow-xl">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-4xl bg-primary/10">
                    {roleInfo.emoji}
                  </AvatarFallback>
                </Avatar>
                {user?.id && (
                  <ImageCropUpload 
                    type="avatar" 
                    currentImage={avatarUrl} 
                    userId={user.id} 
                    onUploadComplete={handleAvatarUpload} 
                  />
                )}
              </div>

              {/* Name & Info */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    {profile?.display_name || 'FUN Farmer'}
                  </h1>
                  {profile?.is_verified && (
                    <BadgeCheck className="w-6 h-6 text-primary fill-primary/20" />
                  )}
                  {(profile as any)?.is_good_heart && (
                    <GoodHeartBadge since={(profile as any)?.good_heart_since} size="md" />
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                  <span className="text-lg">{roleInfo.emoji}</span>
                  <span className="font-medium">{roleInfo.label}</span>
                </div>

                {profile?.wallet_connected && profile.wallet_address && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground font-mono">
                    <Wallet className="w-4 h-4" />
                    {profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}
                  </div>
                )}

                {profile?.location && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pb-4">
                <Link to="/profile-setup">
                  <Button className="gradient-hero border-0 gap-2">
                    <Edit className="w-4 h-4" />
                    Chỉnh sửa hồ sơ
                  </Button>
                </Link>
                <Button variant="outline" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mt-4 py-4 border-y border-border">
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : stats.postsCount}
                </div>
                <div className="text-sm text-muted-foreground">Bài viết</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : stats.friendsCount}
                </div>
                <div className="text-sm text-muted-foreground">Bạn bè</div>
              </div>
              <div className="text-center ml-auto">
                <div className="text-xl font-bold text-accent">{totalCamly.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">CAMLY</div>
              </div>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="mt-4 text-muted-foreground">{profile.bio}</p>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-0 overflow-x-auto">
              <TabsTrigger 
                value="posts" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 gap-2"
              >
                <Grid3X3 className="w-4 h-4" />
                <span className="hidden sm:inline">Bài viết</span>
              </TabsTrigger>
              <TabsTrigger 
                value="about" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 gap-2"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Giới thiệu</span>
              </TabsTrigger>
              <TabsTrigger 
                value="friends" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 gap-2"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Bạn bè</span>
              </TabsTrigger>
              <TabsTrigger 
                value="photos" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Ảnh</span>
              </TabsTrigger>
              <TabsTrigger 
                value="rewards" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 gap-2"
              >
                <Gift className="w-4 h-4" />
                <span className="hidden sm:inline">Nhận thưởng</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-6 space-y-6">
              {/* Create Post Box */}
              <ProfileCreatePost 
                avatarUrl={avatarUrl}
                displayName={profile?.display_name || undefined}
                profileEmoji={roleInfo.emoji}
                onPostCreated={handlePostCreated}
              />

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : transformedPosts.length > 0 ? (
                transformedPosts.map((post) => (
                  <FeedPost key={post.id} post={post} />
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Chưa có bài viết nào</p>
                  <p className="text-sm mt-1">Hãy chia sẻ câu chuyện đầu tiên của bạn!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="about" className="mt-6">
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-lg mb-4">Giới thiệu</h3>
                <p className="text-muted-foreground">
                  {profile?.bio || "Chưa có thông tin giới thiệu. Hãy cập nhật hồ sơ của bạn!"}
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-xl">{roleInfo.emoji}</span>
                    <span>{roleInfo.label} tại FUN FARM</span>
                  </div>
                  {profile?.location && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <MapPin className="w-5 h-5" />
                      <span>Sống tại {profile.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="w-5 h-5" />
                    <span>Tham gia từ {new Date(profile?.created_at || Date.now()).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="friends" className="mt-6 space-y-6">
              <FriendSearch />
              <FriendRequests />
              <FriendsList />
            </TabsContent>

            <TabsContent value="photos" className="mt-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {posts.filter(p => p.images?.length).flatMap((post) => (
                    post.images?.map((img, i) => (
                      <div key={`${post.id}-${i}`} className="aspect-square rounded-lg overflow-hidden">
                        <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer" />
                      </div>
                    ))
                  ))}
                  {posts.filter(p => p.images?.length).length === 0 && (
                    <div className="col-span-3 text-center py-12 text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Chưa có ảnh nào</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rewards" className="mt-6">
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎁</div>
                  <h3 className="font-semibold text-lg">Phần thưởng của bạn</h3>
                  <div className="mt-4 p-4 rounded-xl bg-accent/10 inline-block">
                    <div className="text-3xl font-bold text-accent">
                      {totalCamly.toLocaleString()} CAMLY
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Số dư hiện tại</div>
                  </div>
                  {profile?.pending_reward && profile.pending_reward > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      (Bao gồm {profile.pending_reward.toLocaleString()} CAMLY chờ nhận)
                    </div>
                  )}
                  <div className="mt-4">
                    <Link to="/reward">
                      <Button className="gradient-hero border-0 gap-2">
                        <Gift className="w-4 h-4" />
                        Xem chi tiết & Claim
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Bottom padding for mobile nav */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default Profile;
