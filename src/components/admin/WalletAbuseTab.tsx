import { useState, useMemo } from "react";
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
  Loader2,
  Shield,
  Wallet,
  Mail,
  Users,
  AlertCircle,
  Link2,
  Trash2
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
import { Textarea } from "@/components/ui/textarea";
import camlyCoinLogo from '@/assets/camly_coin.png';

// Danh sách domain temp mail phổ biến
const TEMP_MAIL_DOMAINS = [
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'guerrillamail.org',
  'mailinator.com', 'yopmail.com', 'yopmail.fr', 'yopmail.net',
  '10minutemail.com', '10minutemail.net', 'throwaway.email',
  'tempail.com', 'fakeinbox.com', 'maildrop.cc', 'mailnesia.com',
  'dispostable.com', 'trashmail.com', 'sharklasers.com', 'guerrillamail.info',
  'grr.la', 'pokemail.net', 'spam4.me', 'mytemp.email',
  'mohmal.com', 'tempmailo.com', 'tempr.email', 'discard.email',
  'discardmail.com', 'mailsac.com', 'tempemailco.com', 'emailondeck.com',
  'tempmailaddress.com', 'getairmail.com', 'moakt.com', 'dropmail.me',
  'mailtemp.net', 'tempsky.com', 'tempmailin.com', 'fakemailgenerator.com',
  'burnermail.io', '33mail.com', 'inboxkitten.com'
];

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
  email?: string;
}

interface WalletAbuseTabProps {
  allUsers: UserData[];
  adminId: string;
  onRefresh: () => void;
}

interface WalletGroup {
  wallet_address: string;
  users: UserData[];
  total_pending: number;
  total_approved: number;
  is_suspicious: boolean;
}

// Kiểm tra email có phải temp mail
const isTempMail = (email: string | undefined): boolean => {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return TEMP_MAIL_DOMAINS.includes(domain);
};

// Kiểm tra tên ảo (quá ngắn, toàn số, pattern spam)
const isFakeName = (name: string | null | undefined): boolean => {
  if (!name) return true;
  const trimmed = name.trim();
  
  // Quá ngắn
  if (trimmed.length < 3) return true;
  
  // Toàn số
  if (/^\d+$/.test(trimmed)) return true;
  
  // Pattern spam: chữ + số random dài (abc123456)
  if (/^[a-z]{1,4}\d{5,}$/i.test(trimmed)) return true;
  
  // Chỉ là test/user/admin
  if (/^(test|user|admin|guest|demo)\d*$/i.test(trimmed)) return true;
  
  return false;
};

export default function WalletAbuseTab({ allUsers, adminId, onRefresh }: WalletAbuseTabProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banAllDialogOpen, setBanAllDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedWalletGroup, setSelectedWalletGroup] = useState<WalletGroup | null>(null);
  const [banReason, setBanReason] = useState("");

  // Phân tích ví chung (>1 tài khoản dùng chung ví)
  const walletGroups = useMemo(() => {
    const groups: Record<string, UserData[]> = {};
    
    allUsers.forEach(user => {
      if (user.wallet_address && user.wallet_address !== '') {
        const wallet = user.wallet_address.toLowerCase();
        if (!groups[wallet]) groups[wallet] = [];
        groups[wallet].push(user);
      }
    });

    // Lọc chỉ các ví có >1 tài khoản
    const duplicateWallets: WalletGroup[] = Object.entries(groups)
      .filter(([_, users]) => users.length > 1)
      .map(([wallet, users]) => ({
        wallet_address: wallet,
        users,
        total_pending: users.reduce((sum, u) => sum + u.pending_reward, 0),
        total_approved: users.reduce((sum, u) => sum + u.approved_reward, 0),
        is_suspicious: users.length > 2 || users.some(u => u.banned)
      }))
      .sort((a, b) => b.users.length - a.users.length);

    return duplicateWallets;
  }, [allUsers]);

  // Phát hiện mail ảo
  const tempMailUsers = useMemo(() => {
    // Không có email trong data hiện tại, nhưng có thể phát hiện qua tên ảo/avatar thiếu
    return allUsers.filter(u => 
      !u.banned && 
      (isFakeName(u.display_name) || !u.avatar_url) &&
      u.pending_reward > 0
    ).sort((a, b) => b.pending_reward - a.pending_reward);
  }, [allUsers]);

  // Tài khoản không tên + không avatar + có pending
  const incompleteProfiles = useMemo(() => {
    return allUsers.filter(u => 
      !u.banned &&
      (!u.display_name || u.display_name.trim().length < 3) &&
      !u.avatar_url &&
      u.pending_reward > 0
    ).sort((a, b) => b.pending_reward - a.pending_reward);
  }, [allUsers]);

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) {
      toast.error("Vui lòng nhập lý do ban");
      return;
    }

    setProcessingId(selectedUser.id);
    try {
      const { error } = await supabase.rpc('ban_user_permanently', {
        p_admin_id: adminId,
        p_user_id: selectedUser.id,
        p_reason: banReason.trim()
      });

      if (error) throw error;

      toast.success(`Đã khóa vĩnh viễn: ${selectedUser.display_name || 'User'}`);
      setBanDialogOpen(false);
      setSelectedUser(null);
      setBanReason("");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBanWalletGroup = async () => {
    if (!selectedWalletGroup || !banReason.trim()) {
      toast.error("Vui lòng nhập lý do ban");
      return;
    }

    setProcessingId(selectedWalletGroup.wallet_address);
    try {
      // Ban tất cả user trong nhóm
      for (const user of selectedWalletGroup.users) {
        if (!user.banned) {
          await supabase.rpc('ban_user_permanently', {
            p_admin_id: adminId,
            p_user_id: user.id,
            p_reason: `Ví chung lạm dụng: ${banReason.trim()}`
          });
        }
      }

      // Blacklist ví
      await supabase.from('blacklisted_wallets').upsert({
        wallet_address: selectedWalletGroup.wallet_address.toLowerCase(),
        reason: `Multi-account abuse: ${banReason.trim()}`,
        is_permanent: true
      });

      toast.success(`Đã ban ${selectedWalletGroup.users.length} tài khoản và blacklist ví!`);
      setBanAllDialogOpen(false);
      setSelectedWalletGroup(null);
      setBanReason("");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingId(null);
    }
  };

  const openBanDialog = (user: UserData) => {
    setSelectedUser(user);
    setBanReason("");
    setBanDialogOpen(true);
  };

  const openBanAllDialog = (group: WalletGroup) => {
    setSelectedWalletGroup(group);
    setBanReason("Sử dụng chung ví với nhiều tài khoản để lạm dụng thưởng");
    setBanAllDialogOpen(true);
  };

  // Thống kê
  const totalDuplicateWallets = walletGroups.length;
  const totalAffectedAccounts = walletGroups.reduce((sum, g) => sum + g.users.length, 0);
  const totalPendingAtRisk = walletGroups.reduce((sum, g) => sum + g.total_pending, 0) + 
    incompleteProfiles.reduce((sum, u) => sum + u.pending_reward, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Lạm dụng ví chung & Mail ảo
          </CardTitle>
          <CardDescription>
            Phát hiện và xử lý tài khoản dùng chung ví, mail ảo, profile thiếu thông tin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Wallet className="h-4 w-4" />
                <span className="text-sm font-medium">Ví chung</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalDuplicateWallets}</p>
              <p className="text-xs text-muted-foreground">{totalAffectedAccounts} tài khoản</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Profile thiếu</span>
              </div>
              <p className="text-2xl font-bold mt-1">{incompleteProfiles.length}</p>
              <p className="text-xs text-muted-foreground">Không tên/avatar</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <Mail className="h-4 w-4" />
                <span className="text-sm font-medium">Tên ảo</span>
              </div>
              <p className="text-2xl font-bold mt-1">{tempMailUsers.length}</p>
              <p className="text-xs text-muted-foreground">Nghi ngờ spam</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <img src={camlyCoinLogo} alt="CLC" className="h-4 w-4" />
                <span className="text-sm font-medium">Thưởng rủi ro</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalPendingAtRisk.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">CAMLY</p>
            </div>
          </div>

          {/* Sub Tabs */}
          <Tabs defaultValue="shared-wallet" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="shared-wallet" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Ví chung ({totalDuplicateWallets})
              </TabsTrigger>
              <TabsTrigger value="incomplete" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Profile thiếu ({incompleteProfiles.length})
              </TabsTrigger>
              <TabsTrigger value="fake-names" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Tên ảo ({tempMailUsers.length})
              </TabsTrigger>
            </TabsList>

            {/* Shared Wallet Tab */}
            <TabsContent value="shared-wallet" className="mt-4 space-y-4">
              {walletGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                  <p>Không phát hiện ví chung nào!</p>
                  <p className="text-sm">Dữ liệu sạch sẽ ❤️</p>
                </div>
              ) : (
                walletGroups.map((group) => (
                  <div key={group.wallet_address} className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/10">
                    {/* Wallet Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-red-500" />
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {group.wallet_address.slice(0, 10)}...{group.wallet_address.slice(-8)}
                        </code>
                        <Badge variant="destructive">{group.users.length} tài khoản</Badge>
                        {group.is_suspicious && (
                          <Badge className="bg-yellow-500">⚠️ Rủi ro cao</Badge>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openBanAllDialog(group)}
                        disabled={processingId === group.wallet_address}
                        className="gap-2"
                      >
                        {processingId === group.wallet_address ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Ban className="h-4 w-4" />
                            Ban tất cả + Blacklist ví
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Users in this wallet */}
                    <div className="space-y-2">
                      {group.users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>{user.display_name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {user.display_name || '(không tên)'}
                                {user.banned && <Badge variant="destructive" className="ml-2">ĐÃ BAN</Badge>}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Pending: {user.pending_reward.toLocaleString()} CLC
                              </p>
                            </div>
                          </div>
                          {!user.banned && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openBanDialog(user)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Ban
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Tổng pending: <strong className="text-red-600">{group.total_pending.toLocaleString()} CLC</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Tổng approved: <strong className="text-orange-600">{group.total_approved.toLocaleString()} CLC</strong>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Incomplete Profiles Tab */}
            <TabsContent value="incomplete" className="mt-4 space-y-3">
              {incompleteProfiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                  <p>Tất cả tài khoản đều có thông tin đầy đủ!</p>
                </div>
              ) : (
                incompleteProfiles.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 dark:bg-orange-900/10">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-dashed border-orange-400">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-orange-100 text-orange-600">?</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {user.display_name || <span className="text-orange-600 italic">(không tên)</span>}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {!user.avatar_url && <Badge variant="outline" className="text-orange-600">Thiếu avatar</Badge>}
                          {(!user.display_name || user.display_name.length < 3) && (
                            <Badge variant="outline" className="text-orange-600">Thiếu tên</Badge>
                          )}
                          <span className="font-mono">
                            Pending: {user.pending_reward.toLocaleString()} CLC
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openBanDialog(user)}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Ban
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Fake Names Tab */}
            <TabsContent value="fake-names" className="mt-4 space-y-3">
              {tempMailUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                  <p>Không phát hiện tên ảo đáng ngờ!</p>
                </div>
              ) : (
                tempMailUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/10">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{user.display_name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {user.display_name || <span className="text-yellow-600 italic">(không tên)</span>}
                          {isFakeName(user.display_name) && (
                            <Badge className="ml-2 bg-yellow-500">Tên nghi ảo</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Pending: {user.pending_reward.toLocaleString()} CLC • 
                          Bài: {user.posts_count || 0} • BL: {user.comments_count || 0}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openBanDialog(user)}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Ban
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Ban Single User Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              Khóa tài khoản vĩnh viễn?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Bạn sắp khóa: <strong>{selectedUser?.display_name || 'User'}</strong></p>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm">
                <ul className="list-disc list-inside space-y-1 text-red-600 dark:text-red-300">
                  <li>Khóa đăng nhập vĩnh viễn</li>
                  <li>Blacklist ví (nếu có)</li>
                  <li>Xóa pending reward: {selectedUser?.pending_reward.toLocaleString()} CLC</li>
                </ul>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lý do ban:</label>
                <Textarea
                  placeholder="Nhập lý do ban..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              disabled={processingId !== null || !banReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {processingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
              Khóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban All Users + Blacklist Wallet Dialog */}
      <AlertDialog open={banAllDialogOpen} onOpenChange={setBanAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Ban tất cả + Blacklist ví?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Ví: <code className="bg-muted px-1 rounded text-xs">{selectedWalletGroup?.wallet_address}</code>
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm">
                <p className="font-medium text-red-700 dark:text-red-400 mb-2">
                  Hành động này sẽ:
                </p>
                <ul className="list-disc list-inside space-y-1 text-red-600 dark:text-red-300">
                  <li>Ban vĩnh viễn {selectedWalletGroup?.users.filter(u => !u.banned).length} tài khoản</li>
                  <li>Blacklist ví - không ai có thể dùng lại</li>
                  <li>Xóa tổng pending: {selectedWalletGroup?.total_pending.toLocaleString()} CLC</li>
                </ul>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lý do ban:</label>
                <Textarea
                  placeholder="Lý do ban..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanWalletGroup}
              disabled={processingId !== null || !banReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {processingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              Ban tất cả + Blacklist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
