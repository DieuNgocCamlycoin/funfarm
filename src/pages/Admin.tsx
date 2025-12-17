import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Gift,
  Loader2,
  Users,
  AlertTriangle,
  Ban,
  CalendarIcon,
  FileText,
  Heart,
  MessageCircle,
  Share2,
  ThumbsUp,
  Eye
} from "lucide-react";
import camlyCoinLogo from '@/assets/camly_coin.png';

interface PendingRewardUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  pending_reward: number;
  approved_reward: number;
}

interface RewardAction {
  id: string;
  user_id: string;
  post_id: string;
  action_type: string;
  rewarded_at: string;
  post_content?: string;
}

interface BannedUser {
  id: string;
  user_id: string;
  reason: string;
  expires_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<PendingRewardUser[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [userActions, setUserActions] = useState<Record<string, RewardAction[]>>({});
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [loadingActions, setLoadingActions] = useState<string | null>(null);

  // Check admin role
  useEffect(() => {
    if (authLoading) return;

    const checkAdminRole = async () => {
      if (!user?.id) {
        navigate('/auth');
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error || !data) {
          toast.error('Bạn không có quyền truy cập trang này');
          navigate('/feed');
          return;
        }

        setIsAdmin(true);
      } catch (err) {
        navigate('/feed');
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminRole();
  }, [user?.id, authLoading, navigate]);

  // Fetch data when admin is confirmed or date changes
  useEffect(() => {
    if (!isAdmin) return;
    fetchPendingRewards();
    fetchBannedUsers();
  }, [isAdmin, selectedDate]);

  const fetchPendingRewards = async () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get users with pending rewards who had actions on selected date
    const { data: actionsData } = await supabase
      .from('user_reward_tracking')
      .select('user_id')
      .gte('rewarded_at', startOfDay.toISOString())
      .lte('rewarded_at', endOfDay.toISOString());

    const userIdsWithActions = [...new Set(actionsData?.map(a => a.user_id) || [])];

    // Get all users with pending rewards
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, pending_reward, approved_reward')
      .gt('pending_reward', 0)
      .order('pending_reward', { ascending: false });

    if (!error && data) {
      // Prioritize users with actions on selected date
      const sorted = data.sort((a, b) => {
        const aHasAction = userIdsWithActions.includes(a.id);
        const bHasAction = userIdsWithActions.includes(b.id);
        if (aHasAction && !bHasAction) return -1;
        if (!aHasAction && bHasAction) return 1;
        return b.pending_reward - a.pending_reward;
      });
      setPendingUsers(sorted);
    }
  };

  const fetchBannedUsers = async () => {
    const { data, error } = await supabase
      .from('reward_bans')
      .select('id, user_id, reason, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false });

    if (!error && data) {
      const userIds = data.map(b => b.user_id);
      const { data: profiles } = await supabase.rpc('get_public_profiles', { user_ids: userIds });

      const enriched = data.map(ban => ({
        ...ban,
        profile: profiles?.find((p: any) => p.id === ban.user_id)
      }));

      setBannedUsers(enriched);
    }
  };

  const fetchUserActions = async (userId: string) => {
    if (userActions[userId]) {
      setExpandedUserId(expandedUserId === userId ? null : userId);
      return;
    }

    setLoadingActions(userId);
    try {
      const { data: actions } = await supabase
        .from('user_reward_tracking')
        .select('id, user_id, post_id, action_type, rewarded_at')
        .eq('user_id', userId)
        .order('rewarded_at', { ascending: false })
        .limit(20);

      if (actions && actions.length > 0) {
        // Get post content for context
        const postIds = [...new Set(actions.map(a => a.post_id).filter(Boolean))];
        const { data: posts } = await supabase
          .from('posts')
          .select('id, content')
          .in('id', postIds);

        const enrichedActions = actions.map(action => ({
          ...action,
          post_content: posts?.find(p => p.id === action.post_id)?.content?.slice(0, 50)
        }));

        setUserActions(prev => ({ ...prev, [userId]: enrichedActions }));
      } else {
        setUserActions(prev => ({ ...prev, [userId]: [] }));
      }
      setExpandedUserId(userId);
    } catch (err) {
      console.error('Error fetching actions:', err);
    } finally {
      setLoadingActions(null);
    }
  };

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('like')) return <ThumbsUp className="h-3 w-3 text-blue-500" />;
    if (actionType.includes('comment')) return <MessageCircle className="h-3 w-3 text-green-500" />;
    if (actionType.includes('share')) return <Share2 className="h-3 w-3 text-purple-500" />;
    if (actionType.includes('post') || actionType.includes('friendship')) return <Heart className="h-3 w-3 text-pink-500" />;
    return <FileText className="h-3 w-3 text-gray-500" />;
  };

  const getActionLabel = (actionType: string) => {
    if (actionType.includes('like_received')) return 'Nhận like';
    if (actionType.includes('comment')) return 'Bình luận';
    if (actionType.includes('share')) return 'Chia sẻ';
    if (actionType.includes('post')) return 'Đăng bài';
    if (actionType.includes('friendship')) return 'Kết bạn';
    return actionType;
  };

  const getActionReward = (actionType: string) => {
    if (actionType.includes('like_received')) return 10000;
    if (actionType.includes('comment')) return 5000;
    if (actionType.includes('share')) return 20000;
    if (actionType.includes('post')) return 10000;
    if (actionType.includes('friendship')) return 10000;
    return 0;
  };

  const handleApproveReward = async (userId: string, userName: string) => {
    setProcessingId(userId);
    try {
      const { data, error } = await supabase.rpc('approve_user_reward', {
        p_user_id: userId,
        p_admin_id: user?.id,
        p_note: 'Approved by admin on ' + format(new Date(), 'dd/MM/yyyy HH:mm')
      });

      if (error) throw error;

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium">Đã duyệt {data?.toLocaleString()} CAMLY!</p>
            <p className="text-sm text-muted-foreground">Thông báo đã gửi đến {userName}</p>
          </div>
        </div>,
        { duration: 4000 }
      );
      fetchPendingRewards();
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReward = async (userId: string, userName: string) => {
    setProcessingId(userId);
    try {
      const { data, error } = await supabase.rpc('reject_user_reward', {
        p_user_id: userId,
        p_admin_id: user?.id,
        p_note: 'Rejected by admin on ' + format(new Date(), 'dd/MM/yyyy HH:mm')
      });

      if (error) throw error;

      toast.success(
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-orange-500" />
          <div>
            <p className="font-medium">Đã từ chối {data?.toLocaleString()} CAMLY</p>
            <p className="text-sm text-muted-foreground">Thông báo nhẹ nhàng đã gửi đến {userName}</p>
          </div>
        </div>,
        { duration: 4000 }
      );
      fetchPendingRewards();
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnbanUser = async (banId: string, userId: string) => {
    setProcessingId(banId);
    try {
      await supabase.from('reward_bans').delete().eq('id', banId);
      await supabase.from('profiles').update({ violation_level: 0, last_violation_at: null }).eq('id', userId);

      toast.success('Đã gỡ ban người dùng');
      fetchBannedUsers();
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Đang kiểm tra quyền admin...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 pt-20 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Quản lý phước lành Fun Farm</p>
            </div>
          </div>

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                Duyệt ngày {format(selectedDate, 'dd/MM/yyyy', { locale: vi })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Chờ duyệt</p>
                  <p className="text-xl font-bold">{pendingUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Đang ban</p>
                  <p className="text-xl font-bold">{bannedUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <img src={camlyCoinLogo} alt="CAMLY" className="h-5 w-5" />
                <div>
                  <p className="text-sm text-muted-foreground">Tổng CAMLY chờ</p>
                  <p className="text-xl font-bold">
                    {pendingUsers.reduce((sum, u) => sum + u.pending_reward, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Admin</p>
                  <p className="text-xl font-bold text-green-500">Online</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rewards" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Duyệt thưởng ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger value="bans" className="flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Users bị ban ({bannedUsers.length})
            </TabsTrigger>
          </TabsList>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Duyệt thưởng ngày {format(selectedDate, 'dd/MM/yyyy', { locale: vi })}
                </CardTitle>
                <CardDescription>
                  Click vào user để xem chi tiết hành động (bài viết/like/share/comment)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Không có người dùng nào chờ duyệt</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingUsers.map((u) => (
                      <div key={u.id} className="border rounded-lg bg-card overflow-hidden">
                        {/* User Row */}
                        <div className="flex items-center justify-between p-4">
                          <div 
                            className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80"
                            onClick={() => fetchUserActions(u.id)}
                          >
                            <Avatar>
                              <AvatarImage src={u.avatar_url || undefined} />
                              <AvatarFallback>{u.display_name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{u.display_name || 'Người dùng'}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  Pending: {u.pending_reward.toLocaleString()} CLC
                                </Badge>
                                <Badge variant="outline">
                                  Approved: {u.approved_reward.toLocaleString()}
                                </Badge>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-muted-foreground">
                              {loadingActions === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          <div className="flex items-center gap-2 ml-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => handleRejectReward(u.id, u.display_name || 'Người dùng')}
                              disabled={processingId === u.id}
                            >
                              {processingId === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApproveReward(u.id, u.display_name || 'Người dùng')}
                              disabled={processingId === u.id}
                            >
                              {processingId === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Duyệt
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Actions */}
                        {expandedUserId === u.id && userActions[u.id] && (
                          <div className="border-t bg-muted/30 p-4">
                            <p className="text-sm font-medium mb-3 text-muted-foreground">
                              Chi tiết hành động ({userActions[u.id].length} hoạt động gần nhất):
                            </p>
                            {userActions[u.id].length === 0 ? (
                              <p className="text-sm text-muted-foreground">Chưa có hành động nào được ghi nhận</p>
                            ) : (
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {userActions[u.id].map((action) => (
                                  <div 
                                    key={action.id} 
                                    className="flex items-center gap-3 p-2 rounded bg-background border text-sm"
                                  >
                                    {getActionIcon(action.action_type)}
                                    <div className="flex-1 min-w-0">
                                      <span className="font-medium">{getActionLabel(action.action_type)}</span>
                                      {action.post_content && (
                                        <span className="text-muted-foreground ml-2 truncate">
                                          "{action.post_content}..."
                                        </span>
                                      )}
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      +{getActionReward(action.action_type).toLocaleString()}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(action.rewarded_at), 'HH:mm dd/MM')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bans Tab */}
          <TabsContent value="bans" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Người dùng bị ban</CardTitle>
                <CardDescription>Quản lý các tài khoản đang bị hạn chế nhận thưởng</CardDescription>
              </CardHeader>
              <CardContent>
                {bannedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Không có người dùng nào đang bị ban</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bannedUsers.map((ban) => (
                      <div 
                        key={ban.id} 
                        className="flex items-center justify-between p-4 border rounded-lg bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={ban.profile?.avatar_url || undefined} />
                            <AvatarFallback>{ban.profile?.display_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{ban.profile?.display_name || 'Người dùng'}</p>
                            <p className="text-sm text-muted-foreground">{ban.reason}</p>
                            <Badge variant="destructive" className="mt-1">
                              Hết hạn: {format(new Date(ban.expires_at), 'dd/MM/yyyy', { locale: vi })}
                            </Badge>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnbanUser(ban.id, ban.user_id)}
                          disabled={processingId === ban.id}
                        >
                          {processingId === ban.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Gỡ ban'
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;