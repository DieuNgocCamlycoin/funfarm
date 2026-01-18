import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { DAILY_REWARD_CAP, TOTAL_WELCOME_BONUS } from "@/lib/constants";
import { 
  Search, 
  Trash2, 
  AlertTriangle, 
  Mail, 
  Wallet, 
  Image, 
  TrendingUp,
  Loader2,
  User,
  Clock,
  FileText,
  MessageCircle,
  ThumbsUp,
  Share2,
  Users,
  Ban
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import camlyCoinLogo from '@/assets/camly_coin.png';

interface UserData {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  pending_reward: number;
  approved_reward: number;
  camly_balance: number;
  wallet_address: string | null;
  wallet_connected: boolean;
  email_verified: boolean;
  avatar_verified: boolean;
  is_verified: boolean;
  created_at: string;
  profile_type: string;
  banned: boolean;
  violation_level: number;
  posts_count?: number;
  comments_count?: number;
  likes_count?: number;
  shares_count?: number;
  last_action?: string;
}

interface SuspiciousUser extends UserData {
  reason: string;
  risk_level: 'high' | 'medium' | 'low';
}

interface QuickDeleteTabProps {
  adminId: string;
  onRefresh: () => void;
}

// Danh sách domain email tạm thời phổ biến
const TEMP_EMAIL_DOMAINS = [
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'mailinator.com',
  'throwaway.email', '10minutemail.com', 'fakeinbox.com', 'trashmail.com',
  'yopmail.com', 'tempail.com', 'disposablemail.com', 'maildrop.cc',
  'getnada.com', 'tempmailo.com', 'tempmailaddress.com', 'mohmal.com',
  'emailondeck.com', 'burnermail.io', 'temp.email', 'tmpmail.org'
];

const QuickDeleteTab = ({ adminId, onRefresh }: QuickDeleteTabProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<UserData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [suspiciousUsers, setSuspiciousUsers] = useState<SuspiciousUser[]>([]);
  const [loadingSuspicious, setLoadingSuspicious] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [deleteReason, setDeleteReason] = useState('fake_account');
  const [isDeleting, setIsDeleting] = useState(false);

  // Load danh sách gợi ý khi mount
  useEffect(() => {
    fetchSuspiciousUsers();
  }, []);

  const fetchSuspiciousUsers = async () => {
    setLoadingSuspicious(true);
    try {
      // Lấy tất cả users
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('banned', false)
        .order('pending_reward', { ascending: false });

      if (error || !users) return;

      // Đếm số ví trùng nhau
      const walletCounts: Record<string, string[]> = {};
      users.forEach(u => {
        if (u.wallet_address && u.wallet_address.trim()) {
          const wallet = u.wallet_address.toLowerCase();
          if (!walletCounts[wallet]) walletCounts[wallet] = [];
          walletCounts[wallet].push(u.id);
        }
      });

      // Lấy thống kê posts, comments
      const { data: postsData } = await supabase
        .from('posts')
        .select('author_id');
      
      const { data: commentsData } = await supabase
        .from('comments')
        .select('author_id');

      const postsCount: Record<string, number> = {};
      const commentsCount: Record<string, number> = {};
      
      postsData?.forEach(p => {
        postsCount[p.author_id] = (postsCount[p.author_id] || 0) + 1;
      });
      
      commentsData?.forEach(c => {
        commentsCount[c.author_id] = (commentsCount[c.author_id] || 0) + 1;
      });

      const suspicious: SuspiciousUser[] = [];

      users.forEach(user => {
        const reasons: string[] = [];
        let riskScore = 0;

        // V3.0: Sử dụng DAILY_REWARD_CAP (500k) và TOTAL_WELCOME_BONUS (100k) làm ngưỡng
        
        // 1. Pending cao bất thường (> 1 ngày cap)
        if (user.pending_reward > DAILY_REWARD_CAP) {
          reasons.push(`Pending cao: ${user.pending_reward.toLocaleString()} CLC (> ${DAILY_REWARD_CAP.toLocaleString()} cap/ngày)`);
          riskScore += 3;
        }

        // 2. Không có avatar thật
        if (!user.avatar_url || !user.avatar_verified) {
          reasons.push('Không có avatar xác thực');
          riskScore += 1;
        }

        // 3. Ví dùng chung (>1 tài khoản)
        if (user.wallet_address) {
          const wallet = user.wallet_address.toLowerCase();
          if (walletCounts[wallet] && walletCounts[wallet].length > 1) {
            reasons.push(`Ví dùng chung (${walletCounts[wallet].length} tài khoản)`);
            riskScore += 3;
          }
        }

        // 4. Tài khoản mới có pending cao (> 1.5x welcome bonus)
        const createdDate = new Date(user.created_at);
        const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceCreation < 3 && user.pending_reward > TOTAL_WELCOME_BONUS * 1.5) {
          reasons.push(`Tài khoản mới (${daysSinceCreation} ngày) + pending > ${(TOTAL_WELCOME_BONUS * 1.5).toLocaleString()} CLC`);
          riskScore += 2;
        }

        // 5. Không có hoạt động thật (0 posts, 0 comments) nhưng có pending > welcome bonus
        const posts = postsCount[user.id] || 0;
        const comments = commentsCount[user.id] || 0;
        if (posts === 0 && comments === 0 && user.pending_reward > TOTAL_WELCOME_BONUS) {
          reasons.push('Không có bài viết/bình luận nhưng pending > welcome bonus');
          riskScore += 2;
        }

        // 6. Không xác thực email + pending > welcome bonus
        if (!user.email_verified && user.pending_reward > TOTAL_WELCOME_BONUS) {
          reasons.push('Email chưa xác thực + pending > welcome bonus');
          riskScore += 1;
        }

        // Chỉ thêm vào danh sách nếu có ít nhất 1 lý do và score >= 2
        if (reasons.length > 0 && riskScore >= 2) {
          suspicious.push({
            ...user,
            posts_count: posts,
            comments_count: comments,
            reason: reasons.join(' • '),
            risk_level: riskScore >= 4 ? 'high' : riskScore >= 2 ? 'medium' : 'low'
          });
        }
      });

      // Sort theo risk level
      suspicious.sort((a, b) => {
        const levelOrder = { high: 0, medium: 1, low: 2 };
        return levelOrder[a.risk_level] - levelOrder[b.risk_level];
      });

      setSuspiciousUsers(suspicious);
    } catch (err) {
      console.error('Error fetching suspicious users:', err);
    } finally {
      setLoadingSuspicious(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Vui lòng nhập UID, email hoặc wallet để tìm kiếm');
      return;
    }

    setIsSearching(true);
    setSearchResult(null);

    try {
      const query = searchQuery.trim().toLowerCase();
      
      // Tìm theo UID, display_name hoặc wallet
      let userData = null;

      // Thử tìm theo UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
      
      if (isUUID) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', query)
          .single();
        userData = data;
      } else {
        // Tìm theo wallet hoặc display_name
        const { data: byWallet } = await supabase
          .from('profiles')
          .select('*')
          .ilike('wallet_address', `%${query}%`)
          .limit(1);
        
        if (byWallet && byWallet.length > 0) {
          userData = byWallet[0];
        } else {
          const { data: byName } = await supabase
            .from('profiles')
            .select('*')
            .ilike('display_name', `%${query}%`)
            .limit(1);
          
          if (byName && byName.length > 0) {
            userData = byName[0];
          }
        }
      }

      if (!userData) {
        toast.error('Không tìm thấy tài khoản');
        return;
      }

      // Lấy thêm thống kê
      const { data: posts } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', userData.id);
      
      const { data: comments } = await supabase
        .from('comments')
        .select('id')
        .eq('author_id', userData.id);

      const { data: lastAction } = await supabase
        .from('user_reward_tracking')
        .select('action_type, rewarded_at')
        .eq('user_id', userData.id)
        .order('rewarded_at', { ascending: false })
        .limit(1);

      setSearchResult({
        ...userData,
        posts_count: posts?.length || 0,
        comments_count: comments?.length || 0,
        last_action: lastAction?.[0]?.rewarded_at || null
      });

    } catch (err) {
      console.error('Search error:', err);
      toast.error('Lỗi tìm kiếm');
    } finally {
      setIsSearching(false);
    }
  };

  const openDeleteDialog = (user: UserData) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const reasonLabels: Record<string, string> = {
        'fake_account': 'Tài khoản ảo/giả mạo',
        'temp_email': 'Email tạm thời',
        'farming_clc': 'Cày CLC lạm dụng',
        'shared_wallet': 'Ví dùng chung',
        'no_real_avatar': 'Không avatar thật',
        'spam': 'Spam hệ thống'
      };

      const banReason = reasonLabels[deleteReason] || deleteReason;

      // Gọi function ban_user_permanently
      const { data, error } = await supabase.rpc('ban_user_permanently', {
        p_admin_id: adminId,
        p_user_id: userToDelete.id,
        p_reason: banReason
      });

      if (error) {
        console.error('Ban error:', error);
        toast.error('Lỗi khi xóa tài khoản: ' + error.message);
        return;
      }

      toast.success(`Đã xóa tài khoản ${userToDelete.display_name || 'Người dùng'}`);
      
      // Clear search result nếu đang hiển thị user này
      if (searchResult?.id === userToDelete.id) {
        setSearchResult(null);
      }

      // Refresh danh sách
      fetchSuspiciousUsers();
      onRefresh();

    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error('Lỗi: ' + err.message);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const getRiskBadge = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Rủi ro cao</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Nghi ngờ</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Theo dõi</Badge>;
    }
  };

  const UserCard = ({ user, showReason = false, reason = '' }: { user: UserData; showReason?: boolean; reason?: string }) => (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback>{user.display_name?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{user.display_name || 'Chưa đặt tên'}</p>
            {user.banned && <Badge variant="destructive">Đã ban</Badge>}
            {!user.avatar_verified && <Badge variant="outline" className="text-orange-500 border-orange-500">Chưa verify avatar</Badge>}
            {!user.email_verified && <Badge variant="outline" className="text-orange-500 border-orange-500">Chưa verify email</Badge>}
          </div>
          
          <p className="text-xs text-muted-foreground mt-1 font-mono">{user.id}</p>
          
          {user.wallet_address && (
            <p className="text-xs text-muted-foreground mt-1">
              <Wallet className="inline h-3 w-3 mr-1" />
              {user.wallet_address.slice(0, 10)}...{user.wallet_address.slice(-8)}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
            <span className="flex items-center gap-1">
              <img src={camlyCoinLogo} alt="CAMLY" className="h-4 w-4" />
              <span className="text-yellow-600 font-medium">Pending: {user.pending_reward.toLocaleString()}</span>
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {user.posts_count || 0} bài
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {user.comments_count || 0} bình luận
            </span>
          </div>

          {showReason && reason && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="inline h-4 w-4 mr-1" />
              {reason}
            </div>
          )}

          {user.last_action && (
            <p className="text-xs text-muted-foreground mt-2">
              <Clock className="inline h-3 w-3 mr-1" />
              Hoạt động cuối: {new Date(user.last_action).toLocaleDateString('vi-VN')}
            </p>
          )}
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => openDeleteDialog(user)}
          disabled={user.banned}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Xóa
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Ô tìm kiếm */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Tìm kiếm tài khoản
          </CardTitle>
          <CardDescription>
            Nhập UID, tên hiển thị hoặc địa chỉ ví để tìm kiếm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nhập UID, tên hoặc wallet address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tìm kiếm'}
            </Button>
          </div>

          {/* Kết quả tìm kiếm */}
          {searchResult && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Kết quả tìm kiếm:</p>
              <UserCard user={searchResult} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danh sách gợi ý */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Tài khoản nghi ngờ ({suspiciousUsers.length})
              </CardTitle>
              <CardDescription>
                Tự động phát hiện: ví dùng chung, pending cao bất thường, không avatar thật...
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSuspiciousUsers} disabled={loadingSuspicious}>
              {loadingSuspicious ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Làm mới'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSuspicious ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Đang phân tích...</p>
            </div>
          ) : suspiciousUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Không phát hiện tài khoản nghi ngờ</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {suspiciousUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-2">
                  {getRiskBadge(user.risk_level)}
                  <div className="flex-1">
                    <UserCard user={user} showReason reason={user.reason} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog xác nhận xóa */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              Xác nhận xóa tài khoản
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Bạn sắp xóa tài khoản:</p>
              {userToDelete && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{userToDelete.display_name || 'Chưa đặt tên'}</p>
                  <p className="text-xs font-mono text-muted-foreground">{userToDelete.id}</p>
                  {userToDelete.wallet_address && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Ví: {userToDelete.wallet_address}
                    </p>
                  )}
                  <p className="text-sm mt-2">
                    Pending: <span className="text-yellow-600 font-medium">{userToDelete.pending_reward.toLocaleString()} CLC</span>
                  </p>
                </div>
              )}
              
              <div className="mt-4">
                <p className="font-medium mb-2">Chọn lý do:</p>
                <RadioGroup value={deleteReason} onValueChange={setDeleteReason}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fake_account" id="fake_account" />
                    <Label htmlFor="fake_account">Tài khoản ảo/giả mạo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="temp_email" id="temp_email" />
                    <Label htmlFor="temp_email">Email tạm thời</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="farming_clc" id="farming_clc" />
                    <Label htmlFor="farming_clc">Cày CLC lạm dụng</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="shared_wallet" id="shared_wallet" />
                    <Label htmlFor="shared_wallet">Ví dùng chung</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no_real_avatar" id="no_real_avatar" />
                    <Label htmlFor="no_real_avatar">Không avatar thật</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="spam" id="spam" />
                    <Label htmlFor="spam">Spam hệ thống</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300 mt-4">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                <strong>Hành động này sẽ:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Ban tài khoản vĩnh viễn</li>
                  <li>Blacklist địa chỉ ví</li>
                  <li>Xóa toàn bộ pending thưởng</li>
                  <li>Không thể khôi phục</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Xóa tài khoản
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuickDeleteTab;
