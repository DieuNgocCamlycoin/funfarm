import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Heart,
  Loader2,
  Shield,
  Users,
  Wallet,
  FileText,
  MessageCircle,
  ThumbsUp,
  Share2,
  AlertCircle,
  UserX
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import camlyCoinLogo from '@/assets/camly_coin.png';

interface UserData {
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
  posts_count?: number;
  comments_count?: number;
  likes_received?: number;
  shares_received?: number;
  total_approved_history?: number;
}

interface UserReviewTabProps {
  allUsers: UserData[];
  adminId: string;
  onRefresh: () => void;
}

// Tiêu chí nghi ngờ lạm dụng
const getSuspicionScore = (user: UserData): number => {
  let score = 0;
  
  // Pending reward cao bất thường (>5 triệu)
  if (user.pending_reward > 5000000) score += 40;
  else if (user.pending_reward > 2000000) score += 20;
  
  // Không có avatar
  if (!user.avatar_url) score += 15;
  
  // Không có tên hoặc tên quá ngắn
  if (!user.display_name || user.display_name.length < 3) score += 15;
  
  // Có lịch sử vi phạm
  if (user.violation_level > 0) score += 25;
  
  // Không có bài viết nhưng có pending thưởng cao
  if ((user.posts_count || 0) === 0 && user.pending_reward > 100000) score += 20;
  
  // Tỉ lệ bất thường: pending cao nhưng không có hoạt động
  const totalActivity = (user.posts_count || 0) + (user.comments_count || 0);
  if (totalActivity === 0 && user.pending_reward > 50000) score += 15;
  
  // Avatar chưa xác minh
  if (!user.avatar_verified) score += 10;
  
  return Math.min(score, 100);
};

const getSuspicionLevel = (score: number): { label: string; color: string } => {
  if (score >= 70) return { label: "Rất cao", color: "bg-red-500" };
  if (score >= 50) return { label: "Cao", color: "bg-orange-500" };
  if (score >= 30) return { label: "Trung bình", color: "bg-yellow-500" };
  return { label: "Thấp", color: "bg-green-500" };
};

export default function UserReviewTab({ allUsers, adminId, onRefresh }: UserReviewTabProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [banReason, setBanReason] = useState("");

  // Phân loại users
  const bannedUsers = allUsers.filter(u => u.banned === true);
  const suspiciousUsers = allUsers
    .filter(u => !u.banned && getSuspicionScore(u) >= 30)
    .sort((a, b) => getSuspicionScore(b) - getSuspicionScore(a));
  const verifiedUsers = allUsers.filter(u => 
    !u.banned && 
    u.is_verified && 
    getSuspicionScore(u) < 30 &&
    (u.posts_count || 0) > 0
  );

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) {
      toast.error("Vui lòng nhập lý do ban");
      return;
    }

    setProcessingId(selectedUser.id);
    try {
      const { data, error } = await supabase.rpc('ban_user_permanently', {
        p_admin_id: adminId,
        p_user_id: selectedUser.id,
        p_reason: banReason.trim()
      });

      if (error) throw error;

      toast.success(
        <div className="flex items-center gap-2">
          <Ban className="h-5 w-5 text-red-500" />
          <div>
            <p className="font-medium">Đã khóa vĩnh viễn!</p>
            <p className="text-sm text-muted-foreground">{selectedUser.display_name || 'User'}</p>
          </div>
        </div>,
        { duration: 4000 }
      );
      
      setBanDialogOpen(false);
      setSelectedUser(null);
      setBanReason("");
      onRefresh();
    } catch (err: any) {
      console.error('Ban error:', err);
      toast.error(err.message || 'Có lỗi xảy ra khi ban user');
    } finally {
      setProcessingId(null);
    }
  };

  const openBanDialog = (user: UserData) => {
    setSelectedUser(user);
    setBanReason("");
    setBanDialogOpen(true);
  };

  const UserRow = ({ user, showSuspicion = false }: { user: UserData; showSuspicion?: boolean }) => {
    const suspicionScore = getSuspicionScore(user);
    const suspicionLevel = getSuspicionLevel(suspicionScore);

    return (
      <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback>{user.display_name?.charAt(0) || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate">{user.display_name || '(không tên)'}</p>
              {user.is_good_heart && <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />}
              {user.is_verified && <CheckCircle className="h-4 w-4 text-green-500" />}
              {user.banned && <Badge variant="destructive">ĐÃ BAN</Badge>}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
              {user.wallet_address && (
                <span className="font-mono bg-muted px-1 rounded">
                  {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                </span>
              )}
              <span>•</span>
              <span>{user.profile_type === 'farmer' ? '🌾' : user.profile_type === 'fisher' ? '🐟' : '🍽️'} {user.profile_type}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="text-center">
            <div className="flex items-center gap-1 text-yellow-600">
              <img src={camlyCoinLogo} alt="CLC" className="h-3 w-3" />
              <span className="font-bold">{user.pending_reward.toLocaleString()}</span>
            </div>
            <span className="text-muted-foreground">Chờ duyệt</span>
          </div>
          <div className="text-center hidden sm:block">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span className="font-medium">{user.posts_count || 0}</span>
            </div>
            <span className="text-muted-foreground">Bài</span>
          </div>
          <div className="text-center hidden sm:block">
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span className="font-medium">{user.comments_count || 0}</span>
            </div>
            <span className="text-muted-foreground">BL</span>
          </div>
          
          {showSuspicion && (
            <div className="text-center">
              <Badge className={`${suspicionLevel.color} text-white text-xs`}>
                {suspicionScore}%
              </Badge>
              <p className="text-xs text-muted-foreground mt-0.5">{suspicionLevel.label}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!user.banned && (
          <Button
            variant="destructive"
            size="sm"
            className="ml-3"
            onClick={() => openBanDialog(user)}
            disabled={processingId === user.id}
          >
            {processingId === user.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Ban className="h-4 w-4 mr-1" />
                Ban
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Rà soát & Khóa tài khoản
          </CardTitle>
          <CardDescription>
            Quản lý tài khoản lạm dụng, nghi ngờ ảo, và bà con thật
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Ban className="h-4 w-4" />
                <span className="text-sm font-medium">Đã khóa vĩnh viễn</span>
              </div>
              <p className="text-2xl font-bold mt-1">{bannedUsers.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Nghi ngờ lạm dụng</span>
              </div>
              <p className="text-2xl font-bold mt-1">{suspiciousUsers.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Bà con thật</span>
              </div>
              <p className="text-2xl font-bold mt-1">{verifiedUsers.length}</p>
            </div>
          </div>

          {/* Sub Tabs */}
          <Tabs defaultValue="suspicious" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="suspicious" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Nghi ngờ ({suspiciousUsers.length})
              </TabsTrigger>
              <TabsTrigger value="banned" className="flex items-center gap-2">
                <Ban className="h-4 w-4" />
                Đã ban ({bannedUsers.length})
              </TabsTrigger>
              <TabsTrigger value="verified" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Bà con thật ({verifiedUsers.length})
              </TabsTrigger>
            </TabsList>

            {/* Suspicious Users */}
            <TabsContent value="suspicious" className="mt-4 space-y-3">
              {suspiciousUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Không phát hiện tài khoản nghi ngờ</p>
                </div>
              ) : (
                suspiciousUsers.map(user => (
                  <UserRow key={user.id} user={user} showSuspicion />
                ))
              )}
            </TabsContent>

            {/* Banned Users */}
            <TabsContent value="banned" className="mt-4 space-y-3">
              {bannedUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Ban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Chưa có tài khoản nào bị khóa vĩnh viễn</p>
                </div>
              ) : (
                bannedUsers.map(user => (
                  <div key={user.id} className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 opacity-60">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{user.display_name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium line-through text-muted-foreground">
                            {user.display_name || '(không tên)'}
                          </p>
                          {user.wallet_address && (
                            <code className="text-xs bg-muted px-1 rounded font-mono">
                              {user.wallet_address.slice(0, 10)}...{user.wallet_address.slice(-6)}
                            </code>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive">KHÓA VĨNH VIỄN</Badge>
                        {user.ban_reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Lý do: {user.ban_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Verified Users */}
            <TabsContent value="verified" className="mt-4 space-y-3">
              {verifiedUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Chưa có bà con nào được xác minh</p>
                </div>
              ) : (
                verifiedUsers.slice(0, 50).map(user => (
                  <UserRow key={user.id} user={user} />
                ))
              )}
              {verifiedUsers.length > 50 && (
                <p className="text-center text-sm text-muted-foreground">
                  Hiển thị 50/{verifiedUsers.length} bà con thật
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Ban Confirmation Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              Khóa tài khoản vĩnh viễn?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Bạn sắp khóa vĩnh viễn tài khoản: <strong>{selectedUser?.display_name || 'User'}</strong>
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm">
                <p className="font-medium text-red-700 dark:text-red-400 mb-2">Hành động này sẽ:</p>
                <ul className="list-disc list-inside space-y-1 text-red-600 dark:text-red-300">
                  <li>Khóa đăng nhập vĩnh viễn</li>
                  <li>Không cho cập nhật profile</li>
                  <li>Blacklist ví blockchain</li>
                  <li>Xóa toàn bộ pending reward</li>
                  <li>Không thể hoàn tác</li>
                </ul>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lý do ban:</label>
                <Textarea
                  placeholder="Nhập lý do ban (bắt buộc)..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingId !== null}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              disabled={processingId !== null || !banReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {processingId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Khóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
