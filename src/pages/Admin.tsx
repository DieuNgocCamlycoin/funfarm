import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Ban
} from "lucide-react";

interface PendingRewardUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  pending_reward: number;
  approved_reward: number;
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

  // Check admin role using has_role RPC - wait for auth to finish loading first
  useEffect(() => {
    // Don't check until auth is done loading
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

        if (error) {
          console.error('Error checking admin role:', error);
          toast.error('Không thể kiểm tra quyền admin');
          navigate('/feed');
          return;
        }

        if (!data) {
          toast.error('Bạn không có quyền truy cập trang này');
          navigate('/feed');
          return;
        }

        setIsAdmin(true);
      } catch (err) {
        console.error('Admin check failed:', err);
        navigate('/feed');
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminRole();
  }, [user?.id, authLoading, navigate]);

  // Fetch data when admin is confirmed
  useEffect(() => {
    if (!isAdmin) return;
    
    fetchPendingRewards();
    fetchBannedUsers();
  }, [isAdmin]);

  const fetchPendingRewards = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, pending_reward, approved_reward')
      .gt('pending_reward', 0)
      .order('pending_reward', { ascending: false });

    if (!error && data) {
      setPendingUsers(data);
    }
  };

  const fetchBannedUsers = async () => {
    const { data, error } = await supabase
      .from('reward_bans')
      .select('id, user_id, reason, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false });

    if (!error && data) {
      // Get profiles for banned users
      const userIds = data.map(b => b.user_id);
      const { data: profiles } = await supabase.rpc('get_public_profiles', { user_ids: userIds });

      const enriched = data.map(ban => ({
        ...ban,
        profile: profiles?.find((p: any) => p.id === ban.user_id)
      }));

      setBannedUsers(enriched);
    }
  };

  const handleApproveReward = async (userId: string) => {
    setProcessingId(userId);
    try {
      const { data, error } = await supabase.rpc('approve_user_reward', {
        p_user_id: userId,
        p_admin_id: user?.id,
        p_note: 'Approved by admin'
      });

      if (error) throw error;

      toast.success(`Đã duyệt ${data?.toLocaleString()} CAMLY!`);
      fetchPendingRewards();
    } catch (err: any) {
      console.error('Approve error:', err);
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReward = async (userId: string) => {
    setProcessingId(userId);
    try {
      const { data, error } = await supabase.rpc('reject_user_reward', {
        p_user_id: userId,
        p_admin_id: user?.id,
        p_note: 'Rejected by admin'
      });

      if (error) throw error;

      toast.success(`Đã từ chối ${data?.toLocaleString()} CAMLY`);
      fetchPendingRewards();
    } catch (err: any) {
      console.error('Reject error:', err);
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnbanUser = async (banId: string, userId: string) => {
    setProcessingId(banId);
    try {
      const { error } = await supabase
        .from('reward_bans')
        .delete()
        .eq('id', banId);

      if (error) throw error;

      // Reset violation level
      await supabase
        .from('profiles')
        .update({ violation_level: 0, last_violation_at: null })
        .eq('id', userId);

      toast.success('Đã gỡ ban người dùng');
      fetchBannedUsers();
    } catch (err: any) {
      console.error('Unban error:', err);
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingId(null);
    }
  };

  // Loading state
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

  // Not admin (should have redirected, but just in case)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Quản lý hệ thống Fun Farm</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
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
          
          <Card>
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
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Tổng CAMLY chờ</p>
                  <p className="text-xl font-bold">
                    {pendingUsers.reduce((sum, u) => sum + u.pending_reward, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
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
                <CardTitle>Người dùng chờ duyệt thưởng</CardTitle>
                <CardDescription>
                  Duyệt hoặc từ chối CAMLY pending của người dùng
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
                    {pendingUsers.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between p-4 border rounded-lg bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.display_name || 'Người dùng'}</p>
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                Pending: {user.pending_reward.toLocaleString()} CAMLY
                              </Badge>
                              <Badge variant="outline">
                                Approved: {user.approved_reward.toLocaleString()}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRejectReward(user.id)}
                            disabled={processingId === user.id}
                          >
                            {processingId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveReward(user.id)}
                            disabled={processingId === user.id}
                          >
                            {processingId === user.id ? (
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
                <CardDescription>
                  Quản lý các tài khoản đang bị hạn chế
                </CardDescription>
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
                            <AvatarFallback>
                              {ban.profile?.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {ban.profile?.display_name || 'Người dùng'}
                            </p>
                            <p className="text-sm text-muted-foreground">{ban.reason}</p>
                            <Badge variant="destructive" className="mt-1">
                              Hết hạn: {new Date(ban.expires_at).toLocaleDateString('vi-VN')}
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
