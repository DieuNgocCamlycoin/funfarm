import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FeedPost from "@/components/feed/FeedPost";
import { ReportModal } from "@/components/ReportModal";
import ProfileHonorBoard from "@/components/profile/ProfileHonorBoard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoodHeartBadge } from "@/components/GoodHeartBadge";
import { 
  MapPin, 
  Calendar,
  Grid3X3,
  User,
  Users,
  Image as ImageIcon,
  BadgeCheck,
  Loader2,
  UserPlus,
  UserMinus,
  Flag,
  ArrowLeft,
  Gift
} from "lucide-react";
import SendGiftModal from "@/components/wallet/SendGiftModal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const profileTypeLabels: Record<string, { emoji: string; label: string }> = {
  farmer: { emoji: '🧑‍🌾', label: 'Nông dân' },
  fisher: { emoji: '🎣', label: 'Ngư dân' },
  eater: { emoji: '🍽️', label: 'Người ăn sạch' },
  restaurant: { emoji: '👨‍🍳', label: 'Nhà hàng' },
  distributor: { emoji: '📦', label: 'Nhà phân phối' },
  shipper: { emoji: '🚚', label: 'Shipper' },
};

interface UserProfileData {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  profile_type: string;
  is_verified: boolean;
  reputation_score: number;
  created_at: string;
  is_good_heart?: boolean;
  good_heart_since?: string | null;
}

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
}

interface Stats {
  postsCount: number;
  friendsCount: number;
}

type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats>({ postsCount: 0, friendsCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [giftModalOpen, setGiftModalOpen] = useState(false);

  // Redirect to own profile if viewing self
  useEffect(() => {
    if (userId && user?.id === userId) {
      navigate('/profile');
    }
  }, [userId, user?.id, navigate]);

  // Fetch user profile and data
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        // Fetch user profile using RPC
        const { data: profiles, error: profileError } = await supabase
          .rpc('get_public_profiles', { user_ids: [userId] });

        if (profileError) throw profileError;
        
        if (!profiles || profiles.length === 0) {
          toast.error('Không tìm thấy người dùng');
          navigate('/');
          return;
        }

        // Fetch additional profile data for is_good_heart
        const { data: fullProfile } = await supabase
          .from('profiles')
          .select('is_good_heart, good_heart_since')
          .eq('id', userId)
          .single();

        setUserProfile({
          ...profiles[0],
          is_good_heart: fullProfile?.is_good_heart || false,
          good_heart_since: fullProfile?.good_heart_since,
        });

        // Fetch user's posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('author_id', userId)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;
        
        // For share posts, fetch original post data
        const postsWithOriginal = await Promise.all((postsData || []).map(async (post) => {
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
              return {
                ...post,
                original_post: {
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
                }
              };
            }
          }
          return post;
        }));
        
        setPosts(postsWithOriginal);

        // Fetch friends count (accepted friendships where user is either follower or following)
        const { count: friendsCount } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'accepted')
          .or(`follower_id.eq.${userId},following_id.eq.${userId}`);

        setStats({
          postsCount: postsData?.length || 0,
          friendsCount: friendsCount || 0,
        });

        // Check friendship status with current user
        if (user?.id) {
          // Check if current user sent a request to this user
          const { data: sentRequest } = await supabase
            .from('followers')
            .select('id, status')
            .eq('follower_id', user.id)
            .eq('following_id', userId)
            .maybeSingle();
          
          // Check if this user sent a request to current user
          const { data: receivedRequest } = await supabase
            .from('followers')
            .select('id, status')
            .eq('follower_id', userId)
            .eq('following_id', user.id)
            .maybeSingle();

          if (sentRequest?.status === 'accepted' || receivedRequest?.status === 'accepted') {
            setFriendshipStatus('accepted');
          } else if (sentRequest?.status === 'pending') {
            setFriendshipStatus('pending_sent');
          } else if (receivedRequest?.status === 'pending') {
            setFriendshipStatus('pending_received');
          } else {
            setFriendshipStatus('none');
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Lỗi khi tải thông tin người dùng');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, user?.id, navigate]);

  // Real-time subscription for post updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`user-${userId}-posts`).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'posts',
    }, payload => {
      const updatedPost = payload.new as any;
      if (updatedPost.author_id === userId) {
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
  }, [userId]);

  const handleFriendAction = async (action: 'add' | 'cancel' | 'accept' | 'unfriend') => {
    if (!user?.id || !userId) {
      toast.error('Vui lòng đăng nhập để kết bạn');
      return;
    }

    setFriendshipLoading(true);
    try {
      switch (action) {
        case 'add':
          // Send friend request
          const { error: addError } = await supabase
            .from('followers')
            .insert({ follower_id: user.id, following_id: userId, status: 'pending' });
          if (addError) throw addError;
          setFriendshipStatus('pending_sent');
          toast.success('Đã gửi lời mời kết bạn');
          break;

        case 'cancel':
          // Cancel sent request
          const { error: cancelError } = await supabase
            .from('followers')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', userId);
          if (cancelError) throw cancelError;
          setFriendshipStatus('none');
          toast.success('Đã hủy lời mời kết bạn');
          break;

        case 'accept':
          // Accept received request
          const { error: acceptError } = await supabase
            .from('followers')
            .update({ status: 'accepted' })
            .eq('follower_id', userId)
            .eq('following_id', user.id);
          if (acceptError) throw acceptError;
          setFriendshipStatus('accepted');
          setStats(prev => ({ ...prev, friendsCount: prev.friendsCount + 1 }));
          toast.success('Đã chấp nhận lời mời kết bạn');
          break;

        case 'unfriend':
          // Remove friendship (delete from both directions)
          const { error: unfriendError1 } = await supabase
            .from('followers')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', userId);
          
          const { error: unfriendError2 } = await supabase
            .from('followers')
            .delete()
            .eq('follower_id', userId)
            .eq('following_id', user.id);
          
          if (unfriendError1 && unfriendError2) throw unfriendError1;
          setFriendshipStatus('none');
          setStats(prev => ({ ...prev, friendsCount: Math.max(0, prev.friendsCount - 1) }));
          toast.success('Đã hủy kết bạn');
          break;
      }
    } catch (error) {
      console.error('Error with friend action:', error);
      toast.error('Có lỗi xảy ra');
    } finally {
      setFriendshipLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  const roleInfo = profileTypeLabels[userProfile.profile_type || 'eater'];

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
      };
    }

    return {
      id: post.id,
      author: {
        id: userProfile.id,
        name: userProfile.display_name || 'FUN Farmer',
        username: userProfile.display_name || 'funfarmer',
        avatar: userProfile.avatar_url || '',
        type: 'farm' as const,
        verified: userProfile.is_verified,
        reputationScore: userProfile.reputation_score,
        location: userProfile.location || '',
        followers: stats.friendsCount,
        following: stats.friendsCount,
        isGoodHeart: userProfile.is_good_heart,
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
      post_type: post.post_type as 'post' | 'share',
      original_post_id: post.original_post_id || undefined,
      share_comment: post.share_comment || undefined,
      original_post: originalPost,
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        {/* Cover Photo */}
        <div className="relative h-64 md:h-80 lg:h-96 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30 overflow-hidden">
          {userProfile.cover_url ? (
            <img 
              src={userProfile.cover_url.split('?')[0]} 
              alt="Cover" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <img 
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=400&fit=crop" 
              alt="Default cover" 
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
          
          {/* Back Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 left-4 bg-background/50 hover:bg-background/80 z-50"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Profile Honor Board - In cover (desktop only) */}
          <div className="absolute top-2 right-2 bottom-2 hidden md:flex items-center justify-center z-40 w-[55%] lg:w-1/2">
            <ProfileHonorBoard 
              userId={userProfile.id} 
              displayName={userProfile.display_name} 
              avatarUrl={userProfile.avatar_url} 
              variant="cover"
            />
          </div>
        </div>
        
        {/* Profile Honor Board - Mobile (below cover) */}
        <div className="md:hidden px-4 -mt-6 relative z-30">
          <ProfileHonorBoard 
            userId={userProfile.id} 
            displayName={userProfile.display_name} 
            avatarUrl={userProfile.avatar_url} 
            variant="standalone"
          />
        </div>

        {/* Profile Info Section */}
        <div className="container max-w-5xl mx-auto px-4">
          <div className="relative -mt-16 md:-mt-20">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              {/* Avatar */}
              <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background shadow-xl">
                <AvatarImage src={userProfile.avatar_url || undefined} />
                <AvatarFallback className="text-4xl bg-primary/10">
                  {roleInfo.emoji}
                </AvatarFallback>
              </Avatar>

              {/* Name & Info */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    {userProfile.display_name || 'FUN Farmer'}
                  </h1>
                  {userProfile.is_verified && (
                    <BadgeCheck className="w-6 h-6 text-primary fill-primary/20" />
                  )}
                  {userProfile.is_good_heart && (
                    <GoodHeartBadge since={userProfile.good_heart_since} size="md" />
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                  <span className="text-lg">{roleInfo.emoji}</span>
                  <span className="font-medium">{roleInfo.label}</span>
                </div>

                {userProfile.location && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {userProfile.location}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pb-4">
                {friendshipStatus === 'none' && (
                  <Button 
                    onClick={() => handleFriendAction('add')}
                    disabled={friendshipLoading}
                    className="gradient-hero border-0"
                  >
                    {friendshipLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Kết bạn
                      </>
                    )}
                  </Button>
                )}
                
                {friendshipStatus === 'pending_sent' && (
                  <Button 
                    onClick={() => handleFriendAction('cancel')}
                    disabled={friendshipLoading}
                    variant="outline"
                    className="border-primary text-primary"
                  >
                    {friendshipLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Loader2 className="w-4 h-4 mr-2" />
                        Đã gửi lời mời
                      </>
                    )}
                  </Button>
                )}
                
                {friendshipStatus === 'pending_received' && (
                  <Button 
                    onClick={() => handleFriendAction('accept')}
                    disabled={friendshipLoading}
                    className="gradient-hero border-0"
                  >
                    {friendshipLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Chấp nhận lời mời
                      </>
                    )}
                  </Button>
                )}
                
                {friendshipStatus === 'accepted' && (
                  <Button 
                    onClick={() => handleFriendAction('unfriend')}
                    disabled={friendshipLoading}
                    className="bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                  >
                    {friendshipLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Bạn bè
                      </>
                    )}
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  onClick={() => setGiftModalOpen(true)}
                  className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Tặng quà
                </Button>
                
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setReportModalOpen(true)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Flag className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mt-4 py-4 border-y border-border">
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">{stats.postsCount}</div>
                <div className="text-sm text-muted-foreground">Bài viết</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">{stats.friendsCount}</div>
                <div className="text-sm text-muted-foreground">Bạn bè</div>
              </div>
            </div>

            {/* Bio */}
            {userProfile.bio && (
              <p className="mt-4 text-muted-foreground">{userProfile.bio}</p>
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
            </TabsList>

            <TabsContent value="posts" className="mt-6 space-y-6">
              {transformedPosts.length > 0 ? (
                transformedPosts.map((post) => (
                  <FeedPost key={post.id} post={post} />
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Chưa có bài viết nào</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="about" className="mt-6">
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-lg mb-4">Giới thiệu</h3>
                <p className="text-muted-foreground">
                  {userProfile.bio || "Chưa có thông tin giới thiệu."}
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-xl">{roleInfo.emoji}</span>
                    <span>{roleInfo.label} tại FUN FARM</span>
                  </div>
                  {userProfile.location && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <MapPin className="w-5 h-5" />
                      <span>Sống tại {userProfile.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="w-5 h-5" />
                    <span>Tham gia từ {new Date(userProfile.created_at).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="friends" className="mt-6">
              <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tính năng đang được phát triển</p>
              </div>
            </TabsContent>

            <TabsContent value="photos" className="mt-6">
              <div className="grid grid-cols-3 gap-1 md:gap-2">
                {posts.flatMap(post => post.images || []).slice(0, 9).map((image, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={image} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </div>
                ))}
                {posts.flatMap(post => post.images || []).length === 0 && (
                  <div className="col-span-3 text-center py-12 text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Chưa có ảnh nào</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportedUserId={userId || ''}
        contentType="user"
      />

      {/* Gift Modal */}
      <SendGiftModal
        isOpen={giftModalOpen}
        onClose={() => setGiftModalOpen(false)}
        onSuccess={() => setGiftModalOpen(false)}
        preselectedUser={{
          id: userProfile.id,
          display_name: userProfile.display_name,
          avatar_url: userProfile.avatar_url,
          profile_type: userProfile.profile_type
        }}
      />
    </div>
  );
};

export default UserProfile;
