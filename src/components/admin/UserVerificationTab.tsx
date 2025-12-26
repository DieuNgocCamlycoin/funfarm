// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Mail, 
  User,
  Loader2,
  Download,
  Search,
  Bell,
  RefreshCw,
  FileText
} from 'lucide-react';

interface VerificationUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  avatar_verified: boolean;
  is_verified: boolean;
  welcome_bonus_claimed: boolean;
  verification_bonus_claimed: boolean;
  profile_type: string;
  created_at: string;
  verified_at: string | null;
}

const UserVerificationTab = () => {
  const [users, setUsers] = useState<VerificationUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<VerificationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'unverified'>('all');
  const [sendingNotice, setSendingNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, filterStatus]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email_verified, avatar_verified, is_verified, welcome_bonus_claimed, profile_type, created_at, verified_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cast and add verification_bonus_claimed (will be undefined if not exists yet)
      const usersWithBonus = (data || []).map(u => ({
        ...u,
        verification_bonus_claimed: (u as any).verification_bonus_claimed || false
      }));

      setUsers(usersWithBonus);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let result = [...users];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.display_name?.toLowerCase().includes(query) ||
        u.id.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus === 'verified') {
      result = result.filter(u => u.is_verified);
    } else if (filterStatus === 'unverified') {
      result = result.filter(u => !u.is_verified);
    }

    setFilteredUsers(result);
  };

  const handleSendReminder = async (userId: string, userName: string) => {
    setSendingNotice(userId);
    try {
      // Insert notification to remind user
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'verification_reminder',
        content: 'Mời bạn hoàn tất xác minh tài khoản để nhận phước lành 50.000 CLC chào mừng! ❤️ Bấm vào hồ sơ để xác minh ngay.'
      });

      if (error) throw error;

      toast.success(`Đã gửi nhắc nhở đến ${userName || 'người dùng'}`);
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast.error('Không thể gửi nhắc nhở: ' + error.message);
    } finally {
      setSendingNotice(null);
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = [
        'ID',
        'Tên hiển thị',
        'Email đã xác minh',
        'Avatar đã xác minh',
        'Đã xác minh hoàn toàn',
        'Đã nhận thưởng chào mừng',
        'Loại hồ sơ',
        'Ngày tạo',
        'Ngày xác minh'
      ];

      const rows = filteredUsers.map(u => [
        u.id,
        u.display_name || '',
        u.email_verified ? 'Có' : 'Chưa',
        u.avatar_verified ? 'Có' : 'Chưa',
        u.is_verified ? 'Có' : 'Chưa',
        u.welcome_bonus_claimed ? 'Có' : 'Chưa',
        u.profile_type,
        u.created_at ? format(new Date(u.created_at), 'dd/MM/yyyy HH:mm') : '',
        u.verified_at ? format(new Date(u.verified_at), 'dd/MM/yyyy HH:mm') : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `xac-minh-user-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Đã xuất ${filteredUsers.length} người dùng ra CSV`);
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      toast.error('Không thể xuất CSV');
    }
  };

  const getProfileTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      farmer: '🌾 Nông dân',
      fisher: '🐟 Ngư dân',
      eater: '🍽️ Ăn ngon',
      restaurant: '🏪 Nhà hàng',
      distributor: '🚚 Phân phối',
      shipper: '🛵 Shipper'
    };
    return labels[type] || type;
  };

  // Stats
  const totalUsers = users.length;
  const verifiedUsers = users.filter(u => u.is_verified).length;
  const unverifiedUsers = users.filter(u => !u.is_verified).length;
  const emailVerifiedOnly = users.filter(u => u.email_verified && !u.is_verified).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Xác minh User
            </CardTitle>
            <CardDescription>
              Quản lý trạng thái xác minh của người dùng
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-1">
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1">
              <Download className="h-4 w-4" />
              Xuất CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Tổng cộng</p>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-green-600">Đã xác minh</p>
            <p className="text-2xl font-bold text-green-600">{verifiedUsers}</p>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-600">Chưa xác minh</p>
            <p className="text-2xl font-bold text-yellow-600">{unverifiedUsers}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-600">Email OK, chưa hoàn tất</p>
            <p className="text-2xl font-bold text-blue-600">{emailVerifiedOnly}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="verified">Đã xác minh</SelectItem>
              <SelectItem value="unverified">Chưa xác minh</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* User List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Không tìm thấy người dùng nào</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredUsers.map((u) => (
              <div 
                key={u.id} 
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback>{u.display_name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.display_name || 'Chưa đặt tên'}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getProfileTypeLabel(u.profile_type)}
                      </Badge>
                      <Badge 
                        variant={u.email_verified ? 'default' : 'secondary'}
                        className={`text-xs ${u.email_verified ? 'bg-green-500' : ''}`}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Email {u.email_verified ? '✓' : '✗'}
                      </Badge>
                      <Badge 
                        variant={u.avatar_verified ? 'default' : 'secondary'}
                        className={`text-xs ${u.avatar_verified ? 'bg-green-500' : ''}`}
                      >
                        <User className="h-3 w-3 mr-1" />
                        Avatar {u.avatar_verified ? '✓' : '✗'}
                      </Badge>
                      {u.welcome_bonus_claimed && (
                        <Badge className="text-xs bg-primary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Đã hoàn tất
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-2">
                  {u.is_verified ? (
                    <Badge className="bg-green-500 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-500/50 gap-1">
                        <XCircle className="h-3 w-3" />
                        Chưa
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSendReminder(u.id, u.display_name || '')}
                        disabled={sendingNotice === u.id}
                        className="h-8 px-2"
                      >
                        {sendingNotice === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          Hiển thị {filteredUsers.length} / {totalUsers} người dùng
        </div>
      </CardContent>
    </Card>
  );
};

export default UserVerificationTab;