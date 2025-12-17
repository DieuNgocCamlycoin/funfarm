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
  Eye,
  Wallet,
  TrendingUp,
  Clock,
  Download
} from "lucide-react";
import { Input } from "@/components/ui/input";
import camlyCoinLogo from '@/assets/camly_coin.png';

interface PendingRewardUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  pending_reward: number;
  approved_reward: number;
}

interface AllUserReward {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  pending_reward: number;
  approved_reward: number;
  camly_balance: number;
  wallet_connected: boolean;
  wallet_address: string | null;
  is_verified: boolean;
  email_verified: boolean;
  avatar_verified: boolean;
  violation_level: number;
  last_violation_at: string | null;
  is_good_heart: boolean;
  created_at: string;
  is_banned?: boolean;
  ban_reason?: string;
  ban_expires_at?: string;
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
  const [allUsers, setAllUsers] = useState<AllUserReward[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [userActions, setUserActions] = useState<Record<string, RewardAction[]>>({});
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [loadingActions, setLoadingActions] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    fetchAllUsers();
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

  const fetchAllUsers = async () => {
    // Fetch all users with full details
    const { data: usersData, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, pending_reward, approved_reward, camly_balance, wallet_connected, wallet_address, is_verified, email_verified, avatar_verified, violation_level, last_violation_at, is_good_heart, created_at')
      .order('created_at', { ascending: false });

    if (error || !usersData) return;

    // Fetch all active bans
    const { data: bansData } = await supabase
      .from('reward_bans')
      .select('user_id, reason, expires_at')
      .gt('expires_at', new Date().toISOString());

    // Merge ban info into users
    const usersWithBans = usersData.map(user => {
      const ban = bansData?.find(b => b.user_id === user.id);
      return {
        ...user,
        is_banned: !!ban,
        ban_reason: ban?.reason || null,
        ban_expires_at: ban?.expires_at || null
      };
    });

    setAllUsers(usersWithBans as AllUserReward[]);
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Duyệt thưởng ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger value="all-users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tất cả Users ({allUsers.length})
            </TabsTrigger>
            <TabsTrigger value="bans" className="flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Bị ban ({bannedUsers.length})
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

          {/* All Users Tab */}
          <TabsContent value="all-users" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Tổng hợp thưởng tất cả Users
                </CardTitle>
                <CardDescription>
                  Danh sách tất cả users với số thưởng đã claim và đang chờ claim
                </CardDescription>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Tìm kiếm theo tên..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const filteredUsers = allUsers.filter(u => 
                        !searchQuery || 
                        u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                      
                      // Create CSV content with all data
                      const headers = ['Tên', 'Email Verified', 'Avatar Verified', 'Verified', 'Ngày tạo', 'Chờ duyệt (CLC)', 'Đã duyệt (CLC)', 'Trong ví (CLC)', 'Địa chỉ ví', 'Kết nối ví', 'Vi phạm', 'Ngày vi phạm', 'Good Heart', 'Bị ban', 'Lý do ban', 'Hết ban'];
                      const rows = filteredUsers.map(u => [
                        u.display_name || 'Người dùng',
                        u.email_verified ? 'Có' : 'Không',
                        u.avatar_verified ? 'Có' : 'Không',
                        u.is_verified ? 'Có' : 'Không',
                        format(new Date(u.created_at), 'dd/MM/yyyy HH:mm'),
                        u.pending_reward,
                        u.approved_reward,
                        u.camly_balance,
                        u.wallet_address || '',
                        u.wallet_connected ? 'Có' : 'Không',
                        u.violation_level,
                        u.last_violation_at ? format(new Date(u.last_violation_at), 'dd/MM/yyyy') : '',
                        u.is_good_heart ? 'Có' : 'Không',
                        u.is_banned ? 'Có' : 'Không',
                        u.ban_reason || '',
                        u.ban_expires_at ? format(new Date(u.ban_expires_at), 'dd/MM/yyyy') : ''
                      ]);
                      
                      const csvContent = [
                        headers.join(','),
                        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                      ].join('\n');
                      
                      // Download file
                      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `fun-farm-users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
                      link.click();
                      
                      toast.success(`Đã xuất ${filteredUsers.length} users ra file CSV`);
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Wallet className="h-4 w-4" />
                      <span className="text-xs font-medium">Tổng đã duyệt</span>
                    </div>
                    <p className="text-lg font-bold mt-1">
                      {allUsers.reduce((sum, u) => sum + u.approved_reward, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Chờ duyệt</span>
                    </div>
                    <p className="text-lg font-bold mt-1">
                      {allUsers.reduce((sum, u) => sum + u.pending_reward, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs font-medium">Trong ví</span>
                    </div>
                    <p className="text-lg font-bold mt-1">
                      {allUsers.reduce((sum, u) => sum + u.camly_balance, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                      <Users className="h-4 w-4" />
                      <span className="text-xs font-medium">Tổng users</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{allUsers.length}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <Ban className="h-4 w-4" />
                      <span className="text-xs font-medium">Đang bị ban</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{allUsers.filter(u => u.is_banned).length}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs font-medium">Đã xác minh</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{allUsers.filter(u => u.is_verified).length}</p>
                  </div>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">User</th>
                        <th className="text-right p-3 font-medium">Chờ duyệt</th>
                        <th className="text-right p-3 font-medium">Đã duyệt</th>
                        <th className="text-right p-3 font-medium">Trong ví</th>
                        <th className="text-center p-3 font-medium">Xác minh</th>
                        <th className="text-center p-3 font-medium">Vi phạm</th>
                        <th className="text-center p-3 font-medium">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers
                        .filter(u => 
                          !searchQuery || 
                          u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.wallet_address?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((u) => (
                          <tr key={u.id} className={`border-b hover:bg-muted/30 transition-colors ${u.is_banned ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={u.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {u.display_name?.charAt(0) || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  {u.is_good_heart && (
                                    <Heart className="h-3 w-3 text-pink-500 absolute -top-1 -right-1 fill-pink-500" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium truncate max-w-[120px]">
                                    {u.display_name || 'Người dùng'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(u.created_at), 'dd/MM/yyyy')}
                                  </p>
                                  {u.wallet_address && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                                      {u.wallet_address.slice(0, 6)}...{u.wallet_address.slice(-4)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <span className={u.pending_reward > 0 ? "text-yellow-600 dark:text-yellow-400 font-medium" : "text-muted-foreground"}>
                                {u.pending_reward.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className={u.approved_reward > 0 ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                                {u.approved_reward.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className={u.camly_balance > 0 ? "text-blue-600 dark:text-blue-400 font-medium" : "text-muted-foreground"}>
                                {u.camly_balance.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex gap-1">
                                  <span className={`text-xs ${u.email_verified ? 'text-green-600' : 'text-muted-foreground'}`} title="Email">
                                    ✉️{u.email_verified ? '✓' : '✗'}
                                  </span>
                                  <span className={`text-xs ${u.avatar_verified ? 'text-green-600' : 'text-muted-foreground'}`} title="Avatar">
                                    🖼️{u.avatar_verified ? '✓' : '✗'}
                                  </span>
                                </div>
                                {u.is_verified && (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <CheckCircle className="h-3 w-3" />
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {u.violation_level > 0 ? (
                                <div className="flex flex-col items-center">
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Lv.{u.violation_level}
                                  </Badge>
                                  {u.last_violation_at && (
                                    <span className="text-xs text-muted-foreground mt-1">
                                      {format(new Date(u.last_violation_at), 'dd/MM')}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-green-600">Sạch</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col items-center gap-1">
                                {u.is_banned ? (
                                  <div className="text-center">
                                    <Badge variant="destructive" className="text-xs">
                                      <Ban className="h-3 w-3 mr-1" />
                                      BAN
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-[80px] truncate" title={u.ban_reason || ''}>
                                      {u.ban_reason}
                                    </p>
                                    {u.ban_expires_at && (
                                      <p className="text-xs text-muted-foreground">
                                        → {format(new Date(u.ban_expires_at), 'dd/MM/yy')}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex gap-1 flex-wrap justify-center">
                                    {u.wallet_connected && (
                                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                        <Wallet className="h-3 w-3" />
                                      </Badge>
                                    )}
                                    {u.is_good_heart && (
                                      <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400">
                                        <Heart className="h-3 w-3" />
                                      </Badge>
                                    )}
                                    {!u.wallet_connected && !u.is_good_heart && (
                                      <Badge variant="outline" className="text-xs text-muted-foreground">
                                        Mới
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;