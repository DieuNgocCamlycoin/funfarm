import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Users, UserX, Clock, CheckCircle, Send, Search, Loader2, AlertCircle, Mail, MailX } from 'lucide-react';

interface MergeStats {
  total: number;
  withEmail: number;
  unmerged: number;
  pending: number;
  provisioned: number;
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
  merge_status: 'none' | 'pending' | 'provisioned' | 'merged';
}

const MergeRequestTab = () => {
  const [stats, setStats] = useState<MergeStats>({ total: 0, withEmail: 0, unmerged: 0, pending: 0, provisioned: 0, merged: 0 });
  const [users, setUsers] = useState<UserMergeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingBatch, setSendingBatch] = useState(false);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('unmerged');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsersFromEdge();
  }, [activeTab]);

  const fetchUsersFromEdge = async () => {
    setLoading(true);
    setSelectedUsers(new Set()); // Reset selection when tab changes
    
    const { data, error } = await supabase.functions.invoke('admin-get-users-for-merge', {
      body: { tab: activeTab, limit: 200 }
    });

    if (error) {
      console.error('Error fetching users:', error);
      toast.error('Không thể tải danh sách users');
      setLoading(false);
      return;
    }

    setUsers(data?.users || []);
    setStats(data?.stats || { total: 0, withEmail: 0, unmerged: 0, pending: 0, provisioned: 0, merged: 0 });
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
      fetchUsersFromEdge();
    }
    
    setSendingUserId(null);
  };

  const sendMergeForSelected = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Chưa chọn user nào');
      return;
    }

    setSendingBatch(true);

    const { data, error } = await supabase.functions.invoke('send-merge-request', {
      body: { user_ids: Array.from(selectedUsers) },
    });

    if (error) {
      console.error('Error sending batch merge:', error);
      toast.error('Lỗi gửi merge: ' + error.message);
    } else {
      toast.success(`Đã gửi merge request cho ${data?.count || 0} users!`);
      setSelectedUsers(new Set());
      fetchUsersFromEdge();
    }

    setSendingBatch(false);
  };

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const selectableUsers = users.filter(u => u.email && u.merge_status === 'none');
  
  const selectAll = () => {
    setSelectedUsers(new Set(selectableUsers.map(u => u.id)));
  };

  const deselectAll = () => {
    setSelectedUsers(new Set());
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
    if (user.merge_status === 'merged') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ Đã merge</Badge>;
    }
    if (user.merge_status === 'provisioned') {
      return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">📧 Chờ set password</Badge>;
    }
    if (user.merge_status === 'pending') {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⏳ Đang chờ</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">❌ Chưa có Fun-ID</Badge>;
  };

  const getEmailBadge = (user: UserMergeInfo) => {
    if (user.email) {
      return (
        <span className="flex items-center gap-1 text-xs text-green-400">
          <Mail className="h-3 w-3" />
          {user.email}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs text-red-400">
        <MailX className="h-3 w-3" />
        Thiếu email
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tổng Users</p>
              <p className="text-xl font-bold">{stats.total}</p>
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
              <p className="text-xl font-bold">{stats.unmerged}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đang chờ</p>
              <p className="text-xl font-bold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Send className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chờ set password</p>
              <p className="text-xl font-bold">{stats.provisioned}</p>
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

      {/* User List Section */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Danh sách Users</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên, email, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {activeTab === 'unmerged' && selectedUsers.size > 0 && (
                <Button 
                  onClick={sendMergeForSelected} 
                  disabled={sendingBatch}
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
                      Gửi Merge ({selectedUsers.size})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="unmerged" className="text-xs">
                Chưa merge ({stats.unmerged})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">
                Đang chờ ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="provisioned" className="text-xs">
                📧 Chờ set password ({stats.provisioned})
              </TabsTrigger>
              <TabsTrigger value="merged" className="text-xs">
                Đã merge ({stats.merged})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {/* Select All for unmerged tab */}
              {activeTab === 'unmerged' && selectableUsers.length > 0 && (
                <div className="flex items-center gap-4 mb-3 p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={selectedUsers.size === selectableUsers.length && selectableUsers.length > 0}
                      onCheckedChange={(checked) => checked ? selectAll() : deselectAll()}
                    />
                    <span className="text-sm text-muted-foreground">
                      Chọn tất cả ({selectedUsers.size}/{selectableUsers.length})
                    </span>
                  </div>
                  {selectedUsers.size > 0 && (
                    <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs">
                      Bỏ chọn
                    </Button>
                  )}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Không có users nào
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-3 rounded-lg bg-background/50 border transition-colors ${
                        selectedUsers.has(user.id) 
                          ? 'border-blue-500/50 bg-blue-500/10' 
                          : 'border-border/50 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Checkbox for unmerged users with email */}
                        {activeTab === 'unmerged' && (
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleSelectUser(user.id)}
                            disabled={!user.email}
                          />
                        )}
                        
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
                          <div className="flex items-center gap-3 mt-1">
                            {getEmailBadge(user)}
                            <span className="text-xs text-muted-foreground">
                              {user.camly_balance?.toLocaleString() || 0} CAMLY
                            </span>
                            {user.is_verified && <span className="text-xs">⭐ Verified</span>}
                          </div>
                          {user.fun_id && (
                            <div className="text-xs text-green-400 mt-1">
                              🎫 Fun-ID: {user.fun_id}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-2">
                        {user.merge_status === 'none' && user.email && (
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
                        {user.merge_status === 'pending' && (
                          <span className="text-xs text-yellow-400">⏳ Đã gửi request</span>
                        )}
                        {user.merge_status === 'provisioned' && (
                          <span className="text-xs text-purple-400">📧 Đang chờ user</span>
                        )}
                        {!user.email && user.merge_status === 'none' && (
                          <span className="text-xs text-red-400">⚠️ Cần email</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Info note */}
          {activeTab === 'unmerged' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 p-2 bg-muted/20 rounded">
              <AlertCircle className="h-4 w-4" />
              <span>Chọn users và bấm "Gửi Merge" để gửi request đến Fun Profile. Fun Profile sẽ tự động tạo tài khoản và gửi email set password.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MergeRequestTab;
