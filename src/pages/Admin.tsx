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
  Link,
  RefreshCw,
  Clock,
  Download,
  Search
} from "lucide-react";
import UserReviewTab from "@/components/admin/UserReviewTab";
import WalletAbuseTab from "@/components/admin/WalletAbuseTab";
import QuickDeleteTab from "@/components/admin/QuickDeleteTab";
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
  profile_type: string;
  banned?: boolean;
  ban_reason?: string | null;
  is_banned?: boolean;
  ban_expires_at?: string;
  posts_count?: number;
  comments_count?: number;
  likes_received?: number;
  shares_received?: number;
  total_approved_history?: number; // Total from reward_approvals table
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

interface BlockchainClaimData {
  walletAddress: string;
  totalClaimed: number;
  transactions: number;
  lastClaimAt: string;
  userName?: string;
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
  const [blockchainData, setBlockchainData] = useState<BlockchainClaimData[]>([]);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [blockchainTotalClaimed, setBlockchainTotalClaimed] = useState(0);
  const [blockchainDataSource, setBlockchainDataSource] = useState<string>('');
  const [blockchainLastUpdated, setBlockchainLastUpdated] = useState<string | null>(null);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);

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
    fetchBlockchainData();
  }, [isAdmin, selectedDate]);

  const fetchBlockchainData = async (forceRefresh = false) => {
    setBlockchainLoading(true);
    setBlockchainError(null);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-bscscan-history', {
        body: { forceRefresh }
      });
      
      if (error) {
        console.error('Error fetching blockchain data:', error);
        setBlockchainError('Không thể kết nối đến API');
        return;
      }

      // Xử lý dữ liệu từ response (có thể là live, cache hoặc default)
      if (data) {
        const claimData: BlockchainClaimData[] = Object.entries(data.aggregated || {}).map(([wallet, info]: [string, any]) => ({
          walletAddress: info.walletAddress || wallet,
          totalClaimed: info.totalClaimed || 0,
          transactions: info.transactions || 0,
          lastClaimAt: info.lastClaimAt,
          userName: info.userName || undefined,
        }));

        // Sort theo totalClaimed giảm dần
        claimData.sort((a, b) => b.totalClaimed - a.totalClaimed);

        setBlockchainData(claimData);
        setBlockchainTotalClaimed(data.totalClaimed || 0);
        setBlockchainDataSource(data.dataSource || 'Unknown');
        setBlockchainLastUpdated(data.lastUpdated || null);
        
        // Chỉ hiển thị toast khi force refresh
        if (forceRefresh) {
          const sourceLabel = data.dataSource?.includes('Cache') ? '(từ cache)' 
            : data.dataSource?.includes('BscScan') ? '(BscScan backup)'
            : data.dataSource?.includes('Moralis') ? '(Moralis live)'
            : '';
          toast.success(`Đã tải ${claimData.length} ví ${sourceLabel}`, { duration: 3000 });
        }
        
        // Không báo lỗi, data luôn có từ cache/default
      }
    } catch (err: any) {
      console.error('Error:', err);
      setBlockchainError(err.message || 'Lỗi không xác định');
    } finally {
      setBlockchainLoading(false);
    }
  };

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
    // Fetch all users with full details including banned status
    const { data: usersData, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, pending_reward, approved_reward, camly_balance, wallet_connected, wallet_address, is_verified, email_verified, avatar_verified, violation_level, last_violation_at, is_good_heart, created_at, profile_type, banned, ban_reason')
      .order('created_at', { ascending: false });

    if (error || !usersData) return;

    // Fetch all active bans
    const { data: bansData } = await supabase
      .from('reward_bans')
      .select('user_id, reason, expires_at')
      .gt('expires_at', new Date().toISOString());

    // Fetch posts count per user
    const { data: postsData } = await supabase
      .from('posts')
      .select('author_id');

    // Fetch comments count per user
    const { data: commentsData } = await supabase
      .from('comments')
      .select('author_id');

    // Fetch likes received per user (on their posts)
    const { data: likesData } = await supabase
      .from('posts')
      .select('author_id, likes_count');

    // Fetch shares received per user (on their posts)
    const { data: sharesData } = await supabase
      .from('posts')
      .select('author_id, shares_count');

    // Fetch reward approvals history (total approved per user)
    const { data: approvalsData } = await supabase
      .from('reward_approvals')
      .select('user_id, amount, status')
      .eq('status', 'approved');

    // Calculate counts per user
    const postsCountMap: Record<string, number> = {};
    postsData?.forEach(p => {
      postsCountMap[p.author_id] = (postsCountMap[p.author_id] || 0) + 1;
    });

    const commentsCountMap: Record<string, number> = {};
    commentsData?.forEach(c => {
      commentsCountMap[c.author_id] = (commentsCountMap[c.author_id] || 0) + 1;
    });

    const likesReceivedMap: Record<string, number> = {};
    likesData?.forEach(p => {
      likesReceivedMap[p.author_id] = (likesReceivedMap[p.author_id] || 0) + (p.likes_count || 0);
    });

    const sharesReceivedMap: Record<string, number> = {};
    sharesData?.forEach(p => {
      sharesReceivedMap[p.author_id] = (sharesReceivedMap[p.author_id] || 0) + (p.shares_count || 0);
    });

    // Calculate total approved from history per user
    const approvedHistoryMap: Record<string, number> = {};
    approvalsData?.forEach(a => {
      approvedHistoryMap[a.user_id] = (approvedHistoryMap[a.user_id] || 0) + (a.amount || 0);
    });

    // Merge all info into users
    const usersWithFullInfo = usersData.map(user => {
      const ban = bansData?.find(b => b.user_id === user.id);
      return {
        ...user,
        banned: (user as any).banned || false,
        ban_reason: (user as any).ban_reason || ban?.reason || null,
        is_banned: (user as any).banned || !!ban,
        ban_expires_at: ban?.expires_at || null,
        posts_count: postsCountMap[user.id] || 0,
        comments_count: commentsCountMap[user.id] || 0,
        likes_received: likesReceivedMap[user.id] || 0,
        shares_received: sharesReceivedMap[user.id] || 0,
        total_approved_history: approvedHistoryMap[user.id] || 0,
      };
    });

    setAllUsers(usersWithFullInfo as AllUserReward[]);
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
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="quick-delete" className="flex items-center gap-2 text-xs sm:text-sm">
              <Search className="h-4 w-4 text-red-500" />
              <span className="hidden sm:inline text-red-500 font-medium">Xóa nhanh</span>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2 text-xs sm:text-sm">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Duyệt</span> ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger value="abuse" className="flex items-center gap-2 text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Lạm dụng</span>
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2 text-xs sm:text-sm">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Rà soát</span>
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2 text-xs sm:text-sm">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Đã Duyệt</span> ({allUsers.filter(u => (u.total_approved_history || 0) > 0).length})
            </TabsTrigger>
            <TabsTrigger value="claimed" className="flex items-center gap-2 text-xs sm:text-sm">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Đã Claim</span> ({allUsers.filter(u => u.camly_balance > 0).length})
            </TabsTrigger>
            <TabsTrigger value="blockchain" className="flex items-center gap-2 text-xs sm:text-sm">
              <Link className="h-4 w-4" />
              <span className="hidden sm:inline">BSC</span> ({blockchainData.length})
            </TabsTrigger>
            <TabsTrigger value="all-users" className="flex items-center gap-2 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Tất cả</span> ({allUsers.length})
            </TabsTrigger>
            <TabsTrigger value="bans" className="flex items-center gap-2 text-xs sm:text-sm">
              <Ban className="h-4 w-4" />
              <span className="hidden sm:inline">Ban</span> ({bannedUsers.length})
            </TabsTrigger>
          </TabsList>

          {/* Quick Delete Tab */}
          <TabsContent value="quick-delete" className="mt-4">
            <QuickDeleteTab 
              adminId={user?.id || ''} 
              onRefresh={() => {
                fetchPendingRewards();
                fetchBannedUsers();
                fetchAllUsers();
              }} 
            />
          </TabsContent>

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

          {/* Review Tab */}
          <TabsContent value="review" className="mt-4">
            <UserReviewTab 
              allUsers={allUsers} 
              adminId={user?.id || ''} 
              onRefresh={() => {
                fetchAllUsers();
                fetchBannedUsers();
              }} 
            />
          </TabsContent>

          {/* Wallet Abuse Tab */}
          <TabsContent value="abuse" className="mt-4">
            <WalletAbuseTab 
              allUsers={allUsers} 
              adminId={user?.id || ''} 
              onRefresh={() => {
                fetchAllUsers();
                fetchBannedUsers();
              }} 
            />
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

          {/* Approved Users Tab */}
          <TabsContent value="approved" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                  Tài khoản đã được DUYỆT thưởng CAMLY
                </CardTitle>
                <CardDescription>
                  Danh sách {allUsers.filter(u => (u.total_approved_history || 0) > 0).length} tài khoản đã được admin duyệt thưởng
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Users className="h-4 w-4" />
                      <span className="text-xs font-medium">Tài khoản đã duyệt</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {allUsers.filter(u => (u.total_approved_history || 0) > 0).length}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs font-medium">Tổng đã duyệt</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {allUsers.reduce((sum, u) => sum + (u.total_approved_history || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Đang chờ duyệt</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {allUsers.reduce((sum, u) => sum + u.pending_reward, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <Ban className="h-4 w-4" />
                      <span className="text-xs font-medium">Đã duyệt (bị ban)</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {allUsers.filter(u => (u.total_approved_history || 0) > 0 && u.is_banned).length}
                    </p>
                  </div>
                </div>

                {/* Approved Users Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">#</th>
                        <th className="text-left p-2 font-medium">Tên</th>
                        <th className="text-center p-2 font-medium">Loại</th>
                        <th className="text-right p-2 font-medium">Đã Duyệt</th>
                        <th className="text-right p-2 font-medium">Chờ</th>
                        <th className="text-center p-2 font-medium">Bài</th>
                        <th className="text-center p-2 font-medium">BL</th>
                        <th className="text-center p-2 font-medium">Likes</th>
                        <th className="text-center p-2 font-medium">Shares</th>
                        <th className="text-center p-2 font-medium">TT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers
                        .filter(u => (u.total_approved_history || 0) > 0)
                        .sort((a, b) => (b.total_approved_history || 0) - (a.total_approved_history || 0))
                        .map((u, index) => (
                          <tr key={u.id} className={`border-b hover:bg-muted/30 transition-colors ${u.is_banned ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                            <td className="p-2 text-muted-foreground">{index + 1}</td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={u.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">{u.display_name?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium truncate max-w-[100px] text-xs">{u.display_name || '(không tên)'}</span>
                                {u.is_good_heart && <Heart className="h-3 w-3 text-pink-500 fill-pink-500" />}
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <span className="text-xs">
                                {u.profile_type === 'farmer' && '🌾'}{u.profile_type === 'fisher' && '🐟'}{u.profile_type === 'eater' && '🍽️'}
                                {u.profile_type === 'restaurant' && '🏪'}{u.profile_type === 'distributor' && '🚚'}{u.profile_type === 'shipper' && '📦'}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              <span className="text-blue-600 dark:text-blue-400 font-bold">{(u.total_approved_history || 0).toLocaleString()}</span>
                            </td>
                            <td className="p-2 text-right">
                              {u.pending_reward > 0 ? (
                                <span className="text-yellow-600 dark:text-yellow-400 font-medium">{u.pending_reward.toLocaleString()}</span>
                              ) : <span className="text-muted-foreground">0</span>}
                            </td>
                            <td className="p-2 text-center text-xs">{u.posts_count || 0}</td>
                            <td className="p-2 text-center text-xs">{u.comments_count || 0}</td>
                            <td className="p-2 text-center text-xs text-blue-600">{u.likes_received || 0}</td>
                            <td className="p-2 text-center text-xs text-purple-600">{u.shares_received || 0}</td>
                            <td className="p-2 text-center">
                              {u.is_banned ? <Badge variant="destructive" className="text-xs">BAN</Badge> : u.is_verified ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-muted/50 font-bold">
                      <tr>
                        <td colSpan={3} className="p-2 text-right text-xs">
                          Tổng ({allUsers.filter(u => (u.total_approved_history || 0) > 0).length} TK):
                        </td>
                        <td className="p-2 text-right text-blue-600 dark:text-blue-400">
                          {allUsers.filter(u => (u.total_approved_history || 0) > 0).reduce((sum, u) => sum + (u.total_approved_history || 0), 0).toLocaleString()}
                        </td>
                        <td className="p-2 text-right text-yellow-600 dark:text-yellow-400">
                          {allUsers.filter(u => (u.total_approved_history || 0) > 0).reduce((sum, u) => sum + u.pending_reward, 0).toLocaleString()}
                        </td>
                        <td className="p-2 text-center text-xs">{allUsers.filter(u => (u.total_approved_history || 0) > 0).reduce((sum, u) => sum + (u.posts_count || 0), 0)}</td>
                        <td className="p-2 text-center text-xs">{allUsers.filter(u => (u.total_approved_history || 0) > 0).reduce((sum, u) => sum + (u.comments_count || 0), 0)}</td>
                        <td className="p-2 text-center text-xs text-blue-600">{allUsers.filter(u => (u.total_approved_history || 0) > 0).reduce((sum, u) => sum + (u.likes_received || 0), 0)}</td>
                        <td className="p-2 text-center text-xs text-purple-600">{allUsers.filter(u => (u.total_approved_history || 0) > 0).reduce((sum, u) => sum + (u.shares_received || 0), 0)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Claimed to Wallet Tab */}
          <TabsContent value="claimed" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-green-500" />
                  Tài khoản đã CLAIM CAMLY về ví thật
                </CardTitle>
                <CardDescription>
                  Danh sách {allUsers.filter(u => u.camly_balance > 0).length} tài khoản đã rút CAMLY về ví blockchain (bao gồm cả tài khoản bị ban)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Users className="h-4 w-4" />
                      <span className="text-xs font-medium">Tài khoản đã claim</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {allUsers.filter(u => u.camly_balance > 0).length}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <img src={camlyCoinLogo} alt="CAMLY" className="h-4 w-4" />
                      <span className="text-xs font-medium">Tổng đã Claim về ví</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {allUsers.filter(u => u.camly_balance > 0).reduce((sum, u) => sum + u.camly_balance, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Đang chờ duyệt</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {allUsers.filter(u => u.camly_balance > 0).reduce((sum, u) => sum + u.pending_reward, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <Ban className="h-4 w-4" />
                      <span className="text-xs font-medium">Đã claim (bị ban)</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {allUsers.filter(u => u.camly_balance > 0 && u.is_banned).length}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs font-medium">Avg claim/user</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {allUsers.filter(u => u.camly_balance > 0).length > 0 
                        ? Math.round(allUsers.filter(u => u.camly_balance > 0).reduce((sum, u) => sum + u.camly_balance, 0) / allUsers.filter(u => u.camly_balance > 0).length).toLocaleString()
                        : 0}
                    </p>
                  </div>
                </div>

                {/* Claimed Users Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">#</th>
                        <th className="text-left p-2 font-medium">Tên</th>
                        <th className="text-center p-2 font-medium">Loại</th>
                        <th className="text-left p-2 font-medium">Wallet Address</th>
                        <th className="text-right p-2 font-medium">Đã Claim về ví</th>
                        <th className="text-right p-2 font-medium">Chờ duyệt</th>
                        <th className="text-center p-2 font-medium">Bài</th>
                        <th className="text-center p-2 font-medium">BL</th>
                        <th className="text-center p-2 font-medium">Likes</th>
                        <th className="text-center p-2 font-medium">Shares</th>
                        <th className="text-center p-2 font-medium">TT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers
                        .filter(u => u.camly_balance > 0)
                        .sort((a, b) => b.camly_balance - a.camly_balance)
                        .map((u, index) => (
                          <tr key={u.id} className={`border-b hover:bg-muted/30 transition-colors ${u.is_banned ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                            <td className="p-2 text-muted-foreground">{index + 1}</td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={u.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">{u.display_name?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium truncate max-w-[100px] text-xs">{u.display_name || '(không tên)'}</span>
                                {u.is_good_heart && <Heart className="h-3 w-3 text-pink-500 fill-pink-500" />}
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <span className="text-xs">
                                {u.profile_type === 'farmer' && '🌾'}{u.profile_type === 'fisher' && '🐟'}{u.profile_type === 'eater' && '🍽️'}
                                {u.profile_type === 'restaurant' && '🏪'}{u.profile_type === 'distributor' && '🚚'}{u.profile_type === 'shipper' && '📦'}
                              </span>
                            </td>
                            <td className="p-2">
                              {u.wallet_address ? (
                                <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
                                  {u.wallet_address.slice(0, 6)}...{u.wallet_address.slice(-4)}
                                </code>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="p-2 text-right">
                              <span className="text-green-600 dark:text-green-400 font-bold">{u.camly_balance.toLocaleString()}</span>
                            </td>
                            <td className="p-2 text-right">
                              {u.pending_reward > 0 ? (
                                <span className="text-yellow-600 dark:text-yellow-400 font-medium">{u.pending_reward.toLocaleString()}</span>
                              ) : <span className="text-muted-foreground">0</span>}
                            </td>
                            <td className="p-2 text-center text-xs">{u.posts_count || 0}</td>
                            <td className="p-2 text-center text-xs">{u.comments_count || 0}</td>
                            <td className="p-2 text-center text-xs text-blue-600">{u.likes_received || 0}</td>
                            <td className="p-2 text-center text-xs text-purple-600">{u.shares_received || 0}</td>
                            <td className="p-2 text-center">
                              {u.is_banned ? <Badge variant="destructive" className="text-xs">BAN</Badge> : u.is_verified ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-muted/50 font-bold">
                      <tr>
                        <td colSpan={4} className="p-2 text-right text-xs">
                          Tổng ({allUsers.filter(u => u.camly_balance > 0).length} TK):
                        </td>
                        <td className="p-2 text-right text-green-600 dark:text-green-400">
                          {allUsers.filter(u => u.camly_balance > 0).reduce((sum, u) => sum + u.camly_balance, 0).toLocaleString()}
                        </td>
                        <td className="p-2 text-right text-yellow-600 dark:text-yellow-400">
                          {allUsers.filter(u => u.camly_balance > 0).reduce((sum, u) => sum + u.pending_reward, 0).toLocaleString()}
                        </td>
                        <td className="p-2 text-center text-xs">{allUsers.filter(u => u.camly_balance > 0).reduce((sum, u) => sum + (u.posts_count || 0), 0)}</td>
                        <td className="p-2 text-center text-xs">{allUsers.filter(u => u.camly_balance > 0).reduce((sum, u) => sum + (u.comments_count || 0), 0)}</td>
                        <td className="p-2 text-center text-xs text-blue-600">{allUsers.filter(u => u.camly_balance > 0).reduce((sum, u) => sum + (u.likes_received || 0), 0)}</td>
                        <td className="p-2 text-center text-xs text-purple-600">{allUsers.filter(u => u.camly_balance > 0).reduce((sum, u) => sum + (u.shares_received || 0), 0)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blockchain Claims Tab */}
          <TabsContent value="blockchain" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 flex-wrap">
                  <Link className="h-5 w-5 text-cyan-500" />
                  Lịch sử Claim từ Blockchain
                  {blockchainDataSource && (
                    <Badge 
                      variant={blockchainDataSource.includes('Live') || blockchainDataSource.includes('Moralis') ? 'default' : blockchainDataSource.includes('BscScan') ? 'default' : 'secondary'} 
                      className={`text-xs ${blockchainDataSource.includes('BscScan') ? 'bg-blue-500' : ''}`}
                    >
                      {blockchainDataSource}
                    </Badge>
                  )}
                  <div className="ml-auto flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (blockchainData.length === 0) {
                          toast.error('Không có dữ liệu để export');
                          return;
                        }
                        const headers = ['#', 'Wallet Address', 'Tên trong app', 'Tổng đã Claim', 'Số lần claim', 'Claim gần nhất'];
                        const rows = blockchainData.map((claim, index) => [
                          index + 1,
                          claim.walletAddress,
                          claim.userName || 'Không xác định',
                          claim.totalClaimed,
                          claim.transactions,
                          claim.lastClaimAt ? format(new Date(claim.lastClaimAt), 'dd/MM/yyyy HH:mm') : ''
                        ]);
                        
                        const csvContent = [
                          headers.join(','),
                          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                        ].join('\n');
                        
                        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `blockchain_claims_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
                        link.click();
                        URL.revokeObjectURL(url);
                        toast.success(`Đã export ${blockchainData.length} ví!`);
                      }}
                      disabled={blockchainLoading || blockchainData.length === 0}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchBlockchainData(true)}
                      disabled={blockchainLoading}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${blockchainLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription className="flex items-center gap-2 flex-wrap">
                  Dữ liệu giao dịch chuyển CAMLY từ ví quỹ trả thưởng
                  {blockchainLastUpdated && (
                    <span className="text-xs text-muted-foreground">
                      • Cập nhật: {format(new Date(blockchainLastUpdated), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {blockchainLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Đang tải dữ liệu blockchain...</p>
                  </div>
                ) : blockchainError ? (
                  <div className="text-center py-8 text-red-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Lỗi: {blockchainError}</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchBlockchainData()}>
                      Thử lại
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                          <Wallet className="h-4 w-4" />
                          <span className="text-xs font-medium">Ví đã nhận</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">
                          {blockchainData.length}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <img src={camlyCoinLogo} alt="CAMLY" className="h-4 w-4" />
                          <span className="text-xs font-medium">Tổng CAMLY đã chuyển</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">
                          {blockchainTotalClaimed.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                          <FileText className="h-4 w-4" />
                          <span className="text-xs font-medium">Tổng giao dịch</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">
                          {blockchainData.reduce((sum, c) => sum + c.transactions, 0)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-xs font-medium">Avg/ví</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">
                          {blockchainData.length > 0 
                            ? Math.round(blockchainTotalClaimed / blockchainData.length).toLocaleString()
                            : 0}
                        </p>
                      </div>
                    </div>

                    {blockchainData.length === 0 && blockchainTotalClaimed === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Link className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Không tìm thấy giao dịch nào từ blockchain</p>
                        <p className="text-sm mt-1">Moralis API có thể đang hết quota. Nhấn Refresh để thử lại.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-2 font-medium">#</th>
                              <th className="text-left p-2 font-medium">Wallet Address</th>
                              <th className="text-left p-2 font-medium">Tên (trong app)</th>
                              <th className="text-right p-2 font-medium">Tổng đã Claim</th>
                              <th className="text-center p-2 font-medium">Số lần</th>
                              <th className="text-right p-2 font-medium">Claim gần nhất</th>
                            </tr>
                          </thead>
                          <tbody>
                            {blockchainData.map((claim, index) => (
                              <tr key={claim.walletAddress} className="border-b hover:bg-muted/30 transition-colors">
                                <td className="p-2 text-muted-foreground">{index + 1}</td>
                                <td className="p-2">
                                  <a 
                                    href={`https://bscscan.com/address/${claim.walletAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-xs text-cyan-600 hover:underline"
                                  >
                                    {claim.walletAddress.slice(0, 10)}...{claim.walletAddress.slice(-6)}
                                  </a>
                                </td>
                                <td className="p-2">
                                  {claim.userName ? (
                                    <span className="font-medium text-xs">{claim.userName}</span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs italic">Không xác định</span>
                                  )}
                                </td>
                                <td className="p-2 text-right">
                                  <span className="text-green-600 dark:text-green-400 font-bold">
                                    {claim.totalClaimed.toLocaleString()}
                                  </span>
                                </td>
                                <td className="p-2 text-center">
                                  <Badge variant="secondary">{claim.transactions}</Badge>
                                </td>
                                <td className="p-2 text-right text-xs text-muted-foreground">
                                  {claim.lastClaimAt ? format(new Date(claim.lastClaimAt), 'dd/MM/yyyy HH:mm', { locale: vi }) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-muted/50 font-bold">
                            <tr>
                              <td colSpan={3} className="p-2 text-right text-xs">
                                Tổng ({blockchainData.length} ví):
                              </td>
                              <td className="p-2 text-right text-green-600 dark:text-green-400">
                                {blockchainTotalClaimed.toLocaleString()}
                              </td>
                              <td className="p-2 text-center">
                                {blockchainData.reduce((sum, c) => sum + c.transactions, 0)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </>
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
                  placeholder="Tìm theo tên, UID hoặc wallet..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
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
                      const headers = ['Tên', 'Loại tài khoản', 'Ngày tạo', 'Tổng CAMLY', 'Chờ duyệt', 'Đã duyệt', 'Trong ví', 'Bài viết', 'Bình luận', 'Likes nhận', 'Shares nhận', 'Địa chỉ ví', 'Kết nối ví', 'Verified', 'Vi phạm', 'Ngày vi phạm', 'Good Heart', 'Bị ban', 'Lý do ban', 'Hết ban'];
                      const rows = filteredUsers.map(u => [
                        u.display_name || 'Người dùng',
                        u.profile_type,
                        format(new Date(u.created_at), 'dd/MM/yyyy HH:mm'),
                        u.camly_balance + u.pending_reward + u.approved_reward,
                        u.pending_reward,
                        u.approved_reward,
                        u.camly_balance,
                        u.posts_count || 0,
                        u.comments_count || 0,
                        u.likes_received || 0,
                        u.shares_received || 0,
                        u.wallet_address || '',
                        u.wallet_connected ? 'Có' : 'Không',
                        u.is_verified ? 'Có' : 'Không',
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
                        <th className="text-left p-2 font-medium">User</th>
                        <th className="text-center p-2 font-medium">Loại</th>
                        <th className="text-right p-2 font-medium">Tổng CAMLY</th>
                        <th className="text-right p-2 font-medium">Chờ</th>
                        <th className="text-right p-2 font-medium">Trong ví</th>
                        <th className="text-center p-2 font-medium">Bài viết</th>
                        <th className="text-center p-2 font-medium">Bình luận</th>
                        <th className="text-center p-2 font-medium">Likes</th>
                        <th className="text-center p-2 font-medium">Shares</th>
                        <th className="text-center p-2 font-medium">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers
                        .filter(u => {
                          if (!searchQuery) return true;
                          const query = searchQuery.toLowerCase().trim();
                          return (
                            u.display_name?.toLowerCase().includes(query) ||
                            u.wallet_address?.toLowerCase().includes(query) ||
                            u.id.toLowerCase().includes(query)
                          );
                        })
                        .map((u) => (
                          <tr key={u.id} className={`border-b hover:bg-muted/30 transition-colors ${u.is_banned ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <Avatar className="h-7 w-7">
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
                                  <p className="font-medium truncate max-w-[100px] text-xs">
                                    {u.display_name || 'Người dùng'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(u.created_at), 'dd/MM/yy')}
                                  </p>
                                  {u.wallet_address && (
                                    <code className="text-xs text-muted-foreground">
                                      {u.wallet_address.slice(0, 4)}...{u.wallet_address.slice(-3)}
                                    </code>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <Badge variant="outline" className="text-xs capitalize">
                                {u.profile_type === 'farmer' && '🌾'}
                                {u.profile_type === 'fisher' && '🐟'}
                                {u.profile_type === 'eater' && '🍽️'}
                                {u.profile_type === 'restaurant' && '🏪'}
                                {u.profile_type === 'distributor' && '🚚'}
                                {u.profile_type === 'shipper' && '📦'}
                                {u.profile_type}
                              </Badge>
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex flex-col">
                                <span className="font-bold text-primary">
                                  {(u.camly_balance + u.pending_reward + u.approved_reward).toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Ví: {u.camly_balance.toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="p-2 text-right">
                              <span className={u.pending_reward > 0 ? "text-yellow-600 dark:text-yellow-400 font-medium" : "text-muted-foreground"}>
                                {u.pending_reward.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              <span className={u.camly_balance > 0 ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                                {u.camly_balance.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <FileText className="h-3 w-3 text-muted-foreground" />
                                <span className={u.posts_count && u.posts_count > 0 ? "font-medium" : "text-muted-foreground"}>
                                  {u.posts_count || 0}
                                </span>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <MessageCircle className="h-3 w-3 text-muted-foreground" />
                                <span className={u.comments_count && u.comments_count > 0 ? "font-medium" : "text-muted-foreground"}>
                                  {u.comments_count || 0}
                                </span>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <ThumbsUp className="h-3 w-3 text-blue-500" />
                                <span className={u.likes_received && u.likes_received > 0 ? "font-medium text-blue-600" : "text-muted-foreground"}>
                                  {u.likes_received || 0}
                                </span>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Share2 className="h-3 w-3 text-purple-500" />
                                <span className={u.shares_received && u.shares_received > 0 ? "font-medium text-purple-600" : "text-muted-foreground"}>
                                  {u.shares_received || 0}
                                </span>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="flex flex-col items-center gap-1">
                                {u.is_banned ? (
                                  <div className="text-center">
                                    <Badge variant="destructive" className="text-xs">
                                      <Ban className="h-3 w-3 mr-1" />
                                      BAN
                                    </Badge>
                                    <p className="text-xs text-red-500 mt-1 max-w-[70px] truncate" title={u.ban_reason || ''}>
                                      {u.ban_reason}
                                    </p>
                                    {u.ban_expires_at && (
                                      <p className="text-xs text-muted-foreground">
                                        → {format(new Date(u.ban_expires_at), 'dd/MM')}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1 items-center">
                                    {u.violation_level > 0 && (
                                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-500">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Vi phạm {u.violation_level}
                                      </Badge>
                                    )}
                                    <div className="flex gap-1 flex-wrap justify-center">
                                      {u.is_verified && (
                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                          <CheckCircle className="h-3 w-3" />
                                        </Badge>
                                      )}
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
                                    </div>
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