import { useState, useEffect } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { 
  Trash2, 
  Search, 
  Loader2, 
  UserX,
  Wallet,
  Calendar,
  Download,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import camlyCoinLogo from '@/assets/camly_coin.png';

interface DeletedUser {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  wallet_address: string | null;
  avatar_url: string | null;
  profile_type: string | null;
  pending_reward: number;
  approved_reward: number;
  camly_balance: number;
  is_verified: boolean;
  banned: boolean;
  ban_reason: string | null;
  created_at: string | null;
  deleted_at: string;
  deleted_by: string | null;
  deletion_reason: string | null;
}

export default function DeletedUsersTab() {
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

  const fetchDeletedUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deleted_users')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching deleted users:', err);
      toast.error('Không thể tải danh sách user đã xóa');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (deletedUsers.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const headers = ['Email', 'Tên hiển thị', 'Ví', 'Loại tài khoản', 'Pending', 'Approved', 'Balance', 'Verified', 'Lý do xóa', 'Ngày xóa'];
    const rows = deletedUsers.map(u => [
      u.email || '',
      u.display_name || '',
      u.wallet_address || '',
      u.profile_type || '',
      u.pending_reward || 0,
      u.approved_reward || 0,
      u.camly_balance || 0,
      u.is_verified ? 'Có' : 'Không',
      u.deletion_reason || '',
      u.deleted_at ? format(new Date(u.deleted_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `deleted_users_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${deletedUsers.length} user`);
  };

  const filteredUsers = deletedUsers.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(query) ||
      u.display_name?.toLowerCase().includes(query) ||
      u.wallet_address?.toLowerCase().includes(query) ||
      u.user_id.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-500" />
              User đã xóa ({deletedUsers.length})
            </CardTitle>
            <CardDescription>
              Lịch sử các tài khoản đã bị xóa khỏi hệ thống
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchDeletedUsers}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Làm mới
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" />
              Xuất CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo email, tên, ví, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có user nào bị xóa'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <div key={u.id} className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="bg-red-100 text-red-600">
                      <UserX className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Name & Email */}
                    <div>
                      <p className="font-medium truncate">
                        {u.display_name || 'Không có tên'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {u.email || 'Không có email'}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {u.profile_type && (
                        <Badge variant="outline" className="text-xs">
                          {u.profile_type}
                        </Badge>
                      )}
                      {u.is_verified && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Verified
                        </Badge>
                      )}
                      {u.banned && (
                        <Badge className="bg-red-100 text-red-800 text-xs">
                          Banned
                        </Badge>
                      )}
                    </div>

                    {/* Wallet */}
                    {u.wallet_address && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Wallet className="h-3 w-3" />
                        <span className="font-mono truncate">{u.wallet_address}</span>
                      </div>
                    )}

                    {/* Rewards */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <img src={camlyCoinLogo} alt="CLC" className="h-3 w-3" />
                        <span>Pending: {(u.pending_reward || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-green-600">Approved: {(u.approved_reward || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-blue-600">Balance: {(u.camly_balance || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Deletion info */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Xóa lúc: {format(new Date(u.deleted_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                      {u.deletion_reason && (
                        <span className="text-red-500">• {u.deletion_reason}</span>
                      )}
                    </div>

                    {/* User ID for reference */}
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {u.user_id}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
