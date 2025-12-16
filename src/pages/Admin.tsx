import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Gift,
  Ban,
  Loader2,
  Activity,
  Heart,
  Share2,
  MessageCircle,
  TrendingUp,
  Zap
} from "lucide-react";

interface BonusRequest {
  id: string;
  post_id: string;
  user_id: string;
  status: string;
  bonus_amount: number;
  created_at: string;
  post?: {
    content: string;
    images: string[];
    location_address: string;
  };
  profile?: {
    display_name: string;
    avatar_url: string;
  };
}

interface Violation {
  id: string;
  user_id: string;
  violation_type: string;
  violation_count: number;
  details: any;
  created_at: string;
  profile?: {
    display_name: string;
  };
}

interface UserWithViolation {
  id: string;
  display_name: string;
  avatar_url: string;
  violation_level: number;
  pending_reward: number;
  last_violation_at: string;
  is_good_heart: boolean;
}

interface SpamAlert {
  id: string;
  user_id: string;
  display_name: string;
  action_type: 'like' | 'share' | 'comment';
  count_24h: number;
  timestamp: string;
}

interface TopSpammer {
  user_id: string;
  display_name: string;
  avatar_url: string;
  like_count: number;
  share_count: number;
  comment_count: number;
  total_count: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bonusRequests, setBonusRequests] = useState<BonusRequest[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [flaggedUsers, setFlaggedUsers] = useState<UserWithViolation[]>([]);
  const [activeTab, setActiveTab] = useState("bonus");
  
  // Spam monitoring state
  const [realtimeAlerts, setRealtimeAlerts] = useState<SpamAlert[]>([]);
  const [topSpammers, setTopSpammers] = useState<TopSpammer[]>([]);
  const [activityStats, setActivityStats] = useState({
    likes_1h: 0,
    shares_1h: 0,
    comments_1h: 0,
    total_1h: 0
  });

  // Check admin role
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.id) {
        navigate('/auth');
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!data) {
        toast.error('Bạn không có quyền truy cập trang này');
        navigate('/feed');
        return;
      }

      setIsAdmin(true);
      setIsLoading(false);
    };

    checkAdmin();
  }, [user?.id, navigate]);

  // Fetch data
  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      // Fetch pending bonus requests
      const { data: requests } = await supabase
        .from('bonus_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requests) {
        const postIds = requests.map(r => r.post_id);
        const userIds = requests.map(r => r.user_id);

        const { data: posts } = await supabase
          .from('posts')
          .select('id, content, images, location_address')
          .in('id', postIds);

        const { data: profiles } = await supabase.rpc('get_public_profiles', { user_ids: userIds });

        const enrichedRequests = requests.map(r => ({
          ...r,
          post: posts?.find(p => p.id === r.post_id),
          profile: profiles?.find((p: any) => p.id === r.user_id)
        }));

        setBonusRequests(enrichedRequests);
      }

      // Fetch recent violations
      const { data: violationsData } = await supabase
        .from('user_violations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (violationsData) {
        const userIds = violationsData.map(v => v.user_id);
        const { data: profiles } = await supabase.rpc('get_public_profiles', { user_ids: userIds });

        const enrichedViolations = violationsData.map(v => ({
          ...v,
          profile: profiles?.find((p: any) => p.id === v.user_id)
        }));

        setViolations(enrichedViolations);
      }

      // Fetch flagged users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, violation_level, pending_reward, last_violation_at, is_good_heart')
        .gt('violation_level', 0)
        .order('violation_level', { ascending: false });

      if (usersData) {
        setFlaggedUsers(usersData);
      }
    };

    fetchData();
  }, [isAdmin]);

  // Fetch spam monitoring data
  useEffect(() => {
    if (!isAdmin) return;

    const fetchSpamData = async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // Get activity stats for last hour
      const [likesRes, sharesRes, commentsRes] = await Promise.all([
        supabase.from('post_likes').select('id', { count: 'exact', head: true }).gte('created_at', oneHourAgo),
        supabase.from('post_shares').select('id', { count: 'exact', head: true }).gte('created_at', oneHourAgo),
        supabase.from('comments').select('id', { count: 'exact', head: true }).gte('created_at', oneHourAgo)
      ]);

      setActivityStats({
        likes_1h: likesRes.count || 0,
        shares_1h: sharesRes.count || 0,
        comments_1h: commentsRes.count || 0,
        total_1h: (likesRes.count || 0) + (sharesRes.count || 0) + (commentsRes.count || 0)
      });

      // Get top activity users in 24h
      const { data: likesByUser } = await supabase
        .from('post_likes')
        .select('user_id')
        .gte('created_at', twentyFourHoursAgo);

      const { data: sharesByUser } = await supabase
        .from('post_shares')
        .select('user_id')
        .gte('created_at', twentyFourHoursAgo);

      const { data: commentsByUser } = await supabase
        .from('comments')
        .select('author_id')
        .gte('created_at', twentyFourHoursAgo);

      // Aggregate counts by user
      const userCounts: Record<string, { likes: number; shares: number; comments: number }> = {};

      likesByUser?.forEach(l => {
        if (!userCounts[l.user_id]) userCounts[l.user_id] = { likes: 0, shares: 0, comments: 0 };
        userCounts[l.user_id].likes++;
      });

      sharesByUser?.forEach(s => {
        if (!userCounts[s.user_id]) userCounts[s.user_id] = { likes: 0, shares: 0, comments: 0 };
        userCounts[s.user_id].shares++;
      });

      commentsByUser?.forEach(c => {
        if (!userCounts[c.author_id]) userCounts[c.author_id] = { likes: 0, shares: 0, comments: 0 };
        userCounts[c.author_id].comments++;
      });

      // Get top 10 users with most activity
      const sortedUsers = Object.entries(userCounts)
        .map(([userId, counts]) => ({
          user_id: userId,
          ...counts,
          total: counts.likes + counts.shares + counts.comments
        }))
        .filter(u => u.total >= 20) // Only show users with 20+ actions
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      if (sortedUsers.length > 0) {
        const userIds = sortedUsers.map(u => u.user_id);
        const { data: profiles } = await supabase.rpc('get_public_profiles', { user_ids: userIds });

        const enrichedSpammers: TopSpammer[] = sortedUsers.map(u => ({
          user_id: u.user_id,
          display_name: profiles?.find((p: any) => p.id === u.user_id)?.display_name || 'Người dùng',
          avatar_url: profiles?.find((p: any) => p.id === u.user_id)?.avatar_url || '/placeholder.svg',
          like_count: u.likes,
          share_count: u.shares,
          comment_count: u.comments,
          total_count: u.total
        }));

        setTopSpammers(enrichedSpammers);
      }
    };

    fetchSpamData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchSpamData, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Real-time subscription for spam alerts
  useEffect(() => {
    if (!isAdmin) return;

    // Subscribe to new likes
    const likesChannel = supabase
      .channel('admin-likes-monitor')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'post_likes'
      }, async (payload) => {
        const userId = payload.new.user_id;
        
        // Count user's likes in last 24h
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from('post_likes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', twentyFourHoursAgo);

        if (count && count >= 30) {
          const { data: profile } = await supabase.rpc('get_public_profiles', { user_ids: [userId] });
          const alert: SpamAlert = {
            id: payload.new.id,
            user_id: userId,
            display_name: profile?.[0]?.display_name || 'Người dùng',
            action_type: 'like',
            count_24h: count,
            timestamp: payload.new.created_at
          };
          setRealtimeAlerts(prev => [alert, ...prev].slice(0, 20));
          
          if (count >= 50) {
            toast.warning(`⚠️ ${alert.display_name} đã like ${count} lần trong 24h!`);
          }
        }
      })
      .subscribe();

    // Subscribe to new shares
    const sharesChannel = supabase
      .channel('admin-shares-monitor')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'post_shares'
      }, async (payload) => {
        const userId = payload.new.user_id;
        
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from('post_shares')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', twentyFourHoursAgo);

        if (count && count >= 20) {
          const { data: profile } = await supabase.rpc('get_public_profiles', { user_ids: [userId] });
          const alert: SpamAlert = {
            id: payload.new.id,
            user_id: userId,
            display_name: profile?.[0]?.display_name || 'Người dùng',
            action_type: 'share',
            count_24h: count,
            timestamp: payload.new.created_at
          };
          setRealtimeAlerts(prev => [alert, ...prev].slice(0, 20));
          
          if (count >= 50) {
            toast.warning(`⚠️ ${alert.display_name} đã share ${count} lần trong 24h!`);
          }
        }
      })
      .subscribe();

    // Subscribe to new comments
    const commentsChannel = supabase
      .channel('admin-comments-monitor')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments'
      }, async (payload) => {
        const userId = payload.new.author_id;
        
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', userId)
          .gte('created_at', twentyFourHoursAgo);

        if (count && count >= 30) {
          const { data: profile } = await supabase.rpc('get_public_profiles', { user_ids: [userId] });
          const alert: SpamAlert = {
            id: payload.new.id,
            user_id: userId,
            display_name: profile?.[0]?.display_name || 'Người dùng',
            action_type: 'comment',
            count_24h: count,
            timestamp: payload.new.created_at
          };
          setRealtimeAlerts(prev => [alert, ...prev].slice(0, 20));
          
          if (count >= 50) {
            toast.warning(`⚠️ ${alert.display_name} đã comment ${count} lần trong 24h!`);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(sharesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [isAdmin]);

  const handleApproveBonus = async (request: BonusRequest) => {
    try {
      const bonusAmount = 5000;

      await supabase
        .from('bonus_requests')
        .update({ 
          status: 'approved', 
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          bonus_amount: bonusAmount
        })
        .eq('id', request.id);

      await supabase.rpc('add_camly_reward', { 
        user_id: request.user_id, 
        amount: bonusAmount 
      });

      setBonusRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success(`Đã duyệt bonus +${bonusAmount.toLocaleString()} CAMLY!`);
    } catch (error) {
      console.error('Error approving bonus:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleRejectBonus = async (request: BonusRequest) => {
    try {
      await supabase
        .from('bonus_requests')
        .update({ 
          status: 'rejected', 
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      setBonusRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success('Đã từ chối yêu cầu bonus');
    } catch (error) {
      console.error('Error rejecting bonus:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      await supabase
        .from('reward_bans')
        .delete()
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString());

      await supabase
        .from('profiles')
        .update({ violation_level: 0, last_violation_at: null })
        .eq('id', userId);

      setFlaggedUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('Đã gỡ lệnh cấm cho người dùng');
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleBanSpammer = async (userId: string, displayName: string) => {
    try {
      // Ban for 7 days
      await supabase.from('reward_bans').insert({
        user_id: userId,
        reason: 'Spam activity detected by admin',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      await supabase.from('profiles').update({
        violation_level: 1,
        last_violation_at: new Date().toISOString()
      }).eq('id', userId);

      toast.success(`Đã khóa thưởng ${displayName} trong 7 ngày`);
      setTopSpammers(prev => prev.filter(s => s.user_id !== userId));
    } catch (error) {
      console.error('Error banning spammer:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const getActionIcon = (type: 'like' | 'share' | 'comment') => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-500" />;
      case 'share': return <Share2 className="w-4 h-4 text-blue-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-green-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Đang chờ duyệt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{bonusRequests.length}</div>
                <p className="text-xs text-muted-foreground">yêu cầu bonus</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vi phạm hôm nay</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {violations.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString()).length}
                </div>
                <p className="text-xs text-muted-foreground">trường hợp</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Đang bị cấm</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{flaggedUsers.length}</div>
                <p className="text-xs text-muted-foreground">người dùng</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  Activity 1h
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{activityStats.total_1h}</div>
                <p className="text-xs text-muted-foreground">
                  {activityStats.likes_1h}❤️ {activityStats.shares_1h}🔄 {activityStats.comments_1h}💬
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="bonus" className="gap-2">
                <Gift className="w-4 h-4" />
                Duyệt Bonus ({bonusRequests.length})
              </TabsTrigger>
              <TabsTrigger value="spam" className="gap-2">
                <Zap className="w-4 h-4" />
                Spam Monitor
              </TabsTrigger>
              <TabsTrigger value="violations" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                Vi phạm ({violations.length})
              </TabsTrigger>
              <TabsTrigger value="banned" className="gap-2">
                <Ban className="w-4 h-4" />
                Bị cấm ({flaggedUsers.length})
              </TabsTrigger>
            </TabsList>

            {/* Bonus Requests Tab */}
            <TabsContent value="bonus" className="space-y-4 mt-4">
              {bonusRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Không có yêu cầu bonus nào đang chờ</p>
                  </CardContent>
                </Card>
              ) : (
                bonusRequests.map(request => (
                  <Card key={request.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={request.profile?.avatar_url || '/placeholder.svg'} 
                            alt="" 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <CardTitle className="text-base">{request.profile?.display_name || 'Người dùng'}</CardTitle>
                            <CardDescription>
                              {new Date(request.created_at).toLocaleString('vi-VN')}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          +50% Bonus
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 rounded-lg p-3 mb-4">
                        <p className="text-sm line-clamp-3">{request.post?.content}</p>
                        {request.post?.location_address && (
                          <p className="text-xs text-muted-foreground mt-2">📍 {request.post.location_address}</p>
                        )}
                        {request.post?.images?.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {request.post.images.slice(0, 3).map((img, i) => (
                              <img key={i} src={img} alt="" className="w-16 h-16 rounded object-cover" />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 gap-2" 
                          onClick={() => handleApproveBonus(request)}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Duyệt (+5.000 CAMLY)
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 gap-2"
                          onClick={() => handleRejectBonus(request)}
                        >
                          <XCircle className="w-4 h-4" />
                          Từ chối
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Spam Monitor Tab */}
            <TabsContent value="spam" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Activity Users */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-500" />
                      Top Hoạt động 24h
                    </CardTitle>
                    <CardDescription>Users có nhiều action nhất (≥20)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {topSpammers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Không có user nào có ≥20 action trong 24h
                      </p>
                    ) : (
                      topSpammers.map((spammer, index) => (
                        <div key={spammer.user_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-500 text-white' :
                              index === 1 ? 'bg-gray-400 text-white' :
                              index === 2 ? 'bg-amber-600 text-white' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </span>
                            <img 
                              src={spammer.avatar_url || '/placeholder.svg'} 
                              alt="" 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-medium text-sm">{spammer.display_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {spammer.like_count}❤️ {spammer.share_count}🔄 {spammer.comment_count}💬
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={spammer.total_count >= 50 ? "destructive" : "outline"}>
                              {spammer.total_count}
                            </Badge>
                            {spammer.total_count >= 40 && (
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleBanSpammer(spammer.user_id, spammer.display_name)}
                              >
                                Ban
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Real-time Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-500 animate-pulse" />
                      Real-time Alerts
                    </CardTitle>
                    <CardDescription>Cảnh báo khi user có ≥30 action/24h</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {realtimeAlerts.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          Đang theo dõi... Chưa có cảnh báo mới
                        </p>
                      ) : (
                        realtimeAlerts.map((alert) => (
                          <div 
                            key={alert.id} 
                            className={`flex items-center justify-between p-2 rounded-lg border ${
                              alert.count_24h >= 50 ? 'bg-red-500/10 border-red-500/30' : 'bg-orange-500/10 border-orange-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {getActionIcon(alert.action_type)}
                              <div>
                                <p className="font-medium text-sm">{alert.display_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(alert.timestamp).toLocaleTimeString('vi-VN')}
                                </p>
                              </div>
                            </div>
                            <Badge variant={alert.count_24h >= 50 ? "destructive" : "outline"}>
                              {alert.count_24h} {alert.action_type}s
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Violations Tab */}
            <TabsContent value="violations" className="space-y-2 mt-4">
              {violations.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50 text-green-500" />
                    <p>Không có vi phạm nào gần đây</p>
                  </CardContent>
                </Card>
              ) : (
                violations.map(violation => (
                  <Card key={violation.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="font-medium">{violation.profile?.display_name || 'Người dùng'}</p>
                          <p className="text-sm text-muted-foreground">
                            {violation.violation_type} • {new Date(violation.created_at).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive">Lần {violation.violation_count}</Badge>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Banned Users Tab */}
            <TabsContent value="banned" className="space-y-2 mt-4">
              {flaggedUsers.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Không có người dùng nào đang bị cấm</p>
                  </CardContent>
                </Card>
              ) : (
                flaggedUsers.map(u => (
                  <Card key={u.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={u.avatar_url || '/placeholder.svg'} 
                          alt="" 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium">{u.display_name || 'Người dùng'}</p>
                          <p className="text-sm text-muted-foreground">
                            Vi phạm lần {u.violation_level} • Pending: {u.pending_reward.toLocaleString()} CAMLY
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={u.violation_level >= 3 ? "destructive" : "outline"}
                          className={u.violation_level >= 3 ? "" : "bg-orange-500/10 text-orange-500"}
                        >
                          {u.violation_level >= 3 ? "Vĩnh viễn" : `${u.violation_level === 1 ? '7' : '30'} ngày`}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUnbanUser(u.id)}
                        >
                          Gỡ cấm
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Admin;
