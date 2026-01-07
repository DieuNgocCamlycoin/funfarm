import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Users, UserX, Clock, CheckCircle, Send, Search, Loader2, AlertCircle } from 'lucide-react';

interface MergeStats {
  total_users: number;
  without_fun_id: number;
  pending_merge: number;
  merged: number;
}

interface UserMergeInfo {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  camly_balance: number;
  is_verified: boolean;
  fun_profile_id: string | null;
  fun_id: string | null;
  is_merged: boolean;
  merge_request_id: string | null;
  created_at: string;
}

const MergeRequestTab = () => {
  const [stats, setStats] = useState<MergeStats>({ total_users: 0, without_fun_id: 0, pending_merge: 0, merged: 0 });
  const [users, setUsers] = useState<UserMergeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchLimit, setBatchLimit] = useState(100);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('unmerged');

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [activeTab]);

  const fetchStats = async () => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, fun_profile_id, is_merged, merge_request_id, email');

    if (error) {
      console.error('Error fetching stats:', error);
      return;
    }

    const total = profiles?.length || 0;
    const withEmail = profiles?.filter(p => p.email) || [];
    const withoutFunId = withEmail.filter(p => !p.fun_profile_id && !p.is_merged);
    const pending = withEmail.filter(p => p.merge_request_id && !p.is_merged);
    const merged = profiles?.filter(p => p.is_merged || p.fun_profile_id) || [];

    setStats({
      total_users: total,
      without_fun_id: withoutFunId.length,
      pending_merge: pending.length,
      merged: merged.length,
    });
  };

  const fetchUsers = async () => {
    setLoading(true);
    
    let query = supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url, camly_balance, is_verified, fun_profile_id, fun_id, is_merged, merge_request_id, created_at')
      .not('email', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (activeTab === 'unmerged') {
      query = query.is('fun_profile_id', null).eq('is_merged', false);
    } else if (activeTab === 'pending') {
      query = query.not('merge_request_id', 'is', null).eq('is_merged', false);
    } else if (activeTab === 'merged') {
      query = query.or('is_merged.eq.true,fun_profile_id.not.is.null');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      toast.error('Không thể tải danh sách users');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const sendSingleMergeRequest = async (userId: string) => {
    setSendingUserId(userId);
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      toast.error('Vui lòng đăng nhập lại');
      setSendingUserId(null);
      return;
    }

    const { data, error } = await supabase.functions.invoke('send-merge-request', {
      body: { user_id: userId },
    });

    if (error) {
      console.error('Error sending merge request:', error);
      toast.error('Lỗi gửi merge request: ' + error.message);
    } else {
      toast.success('Đã gửi merge request thành công!');
      fetchStats();
      fetchUsers();
    }
    
    setSendingUserId(null);
  };

  const sendBatchMergeRequest = async () => {
    if (batchLimit < 1 || batchLimit > 500) {
      toast.error('Số lượng phải từ 1 đến 500');
      return;
    }

    setSendingBatch(true);

    const { data, error } = await supabase.functions.invoke('send-merge-request', {
      body: { batch_all: true, limit: batchLimit },
    });

    if (error) {
      console.error('Error sending batch merge:', error);
      toast.error('Lỗi gửi batch merge: ' + error.message);
    } else {
      toast.success(`Đã gửi merge request cho ${data?.count || 0} users!`);
      fetchStats();
      fetchUsers();
    }

    setSendingBatch(false);
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      user.display_name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.id.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (user: UserMergeInfo) => {
    if (user.is_merged || user.fun_profile_id) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ Đã merge</Badge>;
    }
    if (user.merge_request_id) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⏳ Đang chờ</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">❌ Chưa có Fun-ID</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tổng Users</p>
              <p className="text-xl font-bold">{stats.total_users}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <UserX className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chưa có Fun-ID</p>
              <p className="text-xl font-bold">{stats.without_fun_id}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đang chờ merge</p>
              <p className="text-xl font-bold">{stats.pending_merge}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đã merge</p>
              <p className="text-xl font-bold">{stats.merged}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Merge Section */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-400" />
            Gửi Batch Merge Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gửi merge request cho tất cả users chưa có Fun-ID và có email. Fun Profile Admin cần approve để hoàn tất.
          </p>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Số lượng:</span>
              <Input
                type="number"
                value={batchLimit}
                onChange={(e) => setBatchLimit(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-24"
                min={1}
                max={500}
              />
            </div>
            
            <Button 
              onClick={sendBatchMergeRequest} 
              disabled={sendingBatch || stats.without_fun_id === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sendingBatch ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Gửi Batch Merge ({Math.min(batchLimit, stats.without_fun_id)} users)
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <AlertCircle className="h-4 w-4" />
            <span>Lưu ý: Fun Profile Admin cần approve để hoàn tất merge</span>
          </div>
        </CardContent>
      </Card>

      {/* User List Section */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Danh sách Users</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, email, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="unmerged" className="text-xs">
                Chưa merge ({stats.without_fun_id})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">
                Đang chờ ({stats.pending_merge})
              </TabsTrigger>
              <TabsTrigger value="merged" className="text-xs">
                Đã merge ({stats.merged})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Không có users nào
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 hover:border-border transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={user.avatar_url || '/placeholder.svg'}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover bg-muted"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">
                              {user.display_name || 'Chưa đặt tên'}
                            </span>
                            {getStatusBadge(user)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{user.email}</span>
                            <span>•</span>
                            <span>{user.camly_balance?.toLocaleString() || 0} CAMLY</span>
                            {user.is_verified && <span>• ⭐ Verified</span>}
                          </div>
                          {user.fun_id && (
                            <div className="text-xs text-green-400">
                              🎫 Fun-ID: {user.fun_id}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-2">
                        {!user.is_merged && !user.fun_profile_id && !user.merge_request_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendSingleMergeRequest(user.id)}
                            disabled={sendingUserId === user.id}
                            className="text-xs"
                          >
                            {sendingUserId === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Send className="h-3 w-3 mr-1" />
                                Gửi
                              </>
                            )}
                          </Button>
                        )}
                        {user.merge_request_id && !user.is_merged && (
                          <span className="text-xs text-yellow-400">Đã gửi request</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MergeRequestTab;
