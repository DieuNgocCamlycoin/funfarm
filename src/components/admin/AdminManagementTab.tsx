import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Crown, 
  Shield, 
  Clock, 
  MoreVertical, 
  User, 
  Trash2, 
  Search, 
  Send, 
  Loader2,
  CheckCircle,
  XCircle,
  UserPlus
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminUser {
  id: string;
  user_id: string;
  role: 'owner' | 'admin';
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface PendingInvitation {
  id: string;
  invitee_id: string;
  status: string;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface SearchResult {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export function AdminManagementTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<AdminUser | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    checkOwnerAndFetchData();
  }, [user?.id]);

  const checkOwnerAndFetchData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Check if current user is owner
      const { data: ownerCheck } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'owner'
      });
      setIsOwner(!!ownerCheck);

      // Fetch all admin/owner roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role')
        .in('role', ['admin', 'owner']);

      if (rolesError) throw rolesError;

      // Get profile info for each admin
      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, email')
          .in('id', userIds);

        const adminsWithProfiles: AdminUser[] = rolesData.map(role => {
          const profile = profiles?.find(p => p.id === role.user_id);
          return {
            id: role.id,
            user_id: role.user_id,
            role: role.role as 'owner' | 'admin',
            display_name: profile?.display_name || null,
            avatar_url: profile?.avatar_url || null,
            email: profile?.email || null,
          };
        });

        // Sort: owner first, then admins
        adminsWithProfiles.sort((a, b) => {
          if (a.role === 'owner' && b.role !== 'owner') return -1;
          if (a.role !== 'owner' && b.role === 'owner') return 1;
          return (a.display_name || '').localeCompare(b.display_name || '');
        });

        setAdmins(adminsWithProfiles);
      }

      // Fetch pending invitations (only for owners)
      if (ownerCheck) {
        const { data: invitations } = await supabase
          .from('admin_invitations')
          .select('id, invitee_id, status, created_at')
          .eq('status', 'pending');

        if (invitations && invitations.length > 0) {
          const inviteeIds = invitations.map(i => i.invitee_id);
          const { data: inviteeProfiles } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, email')
            .in('id', inviteeIds);

          const pendingWithProfiles: PendingInvitation[] = invitations.map(inv => {
            const profile = inviteeProfiles?.find(p => p.id === inv.invitee_id);
            return {
              ...inv,
              display_name: profile?.display_name || null,
              avatar_url: profile?.avatar_url || null,
              email: profile?.email || null,
            };
          });

          setPendingInvitations(pendingWithProfiles);
        } else {
          setPendingInvitations([]);
        }
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Lỗi khi tải danh sách admin');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email')
        .or(`display_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      // Filter out existing admins and pending invitations
      const existingIds = new Set([
        ...admins.map(a => a.user_id),
        ...pendingInvitations.map(p => p.invitee_id)
      ]);

      const filtered = (data || []).filter(u => !existingIds.has(u.id));
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sendInvitation = async (inviteeId: string, inviteeName: string) => {
    if (!user?.id) return;

    setSendingInvite(inviteeId);
    try {
      // Insert invitation
      const { error: inviteError } = await supabase
        .from('admin_invitations')
        .insert({
          inviter_id: user.id,
          invitee_id: inviteeId,
          status: 'pending'
        });

      if (inviteError) throw inviteError;

      // Send notification to invitee
      await supabase.from('notifications').insert({
        user_id: inviteeId,
        from_user_id: user.id,
        type: 'admin_invite',
        content: 'Bạn được mời làm Quản trị viên Fun Farm! Hãy trả lời lời mời này.'
      });

      toast.success(`Đã gửi lời mời đến ${inviteeName}`);
      setSearchQuery("");
      setSearchResults([]);
      checkOwnerAndFetchData();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      if (error.code === '23505') {
        toast.error('Người này đã có lời mời đang chờ xử lý');
      } else {
        toast.error('Lỗi khi gửi lời mời');
      }
    } finally {
      setSendingInvite(null);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Đã hủy lời mời');
      checkOwnerAndFetchData();
    } catch (error) {
      console.error('Error canceling invitation:', error);
      toast.error('Lỗi khi hủy lời mời');
    }
  };

  const removeAdmin = async () => {
    if (!adminToRemove || !user?.id) return;

    setRemoving(true);
    try {
      const { error } = await supabase.rpc('remove_admin_role', {
        p_owner_id: user.id,
        p_target_user_id: adminToRemove.user_id
      });

      if (error) throw error;

      // Notify the removed admin
      await supabase.from('notifications').insert({
        user_id: adminToRemove.user_id,
        from_user_id: user.id,
        type: 'admin_removed',
        content: 'Quyền Quản trị viên của bạn đã bị thu hồi.'
      });

      toast.success(`Đã xóa quyền admin của ${adminToRemove.display_name || 'người dùng'}`);
      setRemoveDialogOpen(false);
      setAdminToRemove(null);
      checkOwnerAndFetchData();
    } catch (error: any) {
      console.error('Error removing admin:', error);
      toast.error(error.message || 'Lỗi khi xóa quyền admin');
    } finally {
      setRemoving(false);
    }
  };

  const getRoleBadge = (role: 'owner' | 'admin') => {
    if (role === 'owner') {
      return (
        <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0">
          <Crown className="h-3 w-3 mr-1" />
          Chủ sở hữu
        </Badge>
      );
    }
    return (
      <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0">
        <Shield className="h-3 w-3 mr-1" />
        Quản trị viên
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Quản lý Quản trị viên
          </CardTitle>
          <CardDescription>
            {isOwner 
              ? "Gửi lời mời và quản lý quyền admin của hệ thống"
              : "Xem danh sách quản trị viên hệ thống"}
          </CardDescription>
        </CardHeader>

        {/* Search & Invite Section - Only for Owner */}
        {isOwner && (
          <CardContent className="border-t pt-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm user để mời làm admin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {searchResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={result.avatar_url || undefined} />
                          <AvatarFallback>
                            {result.display_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{result.display_name || 'Chưa đặt tên'}</p>
                          <p className="text-sm text-muted-foreground">{result.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => sendInvitation(result.id, result.display_name || 'người dùng')}
                        disabled={sendingInvite === result.id}
                      >
                        {sendingInvite === result.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Mời
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searching && (
                <div className="text-center py-4 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Pending Invitations - Only for Owner */}
      {isOwner && pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Clock className="h-5 w-5" />
              Lời mời đang chờ ({pendingInvitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div 
                  key={invitation.id} 
                  className="flex items-center justify-between p-3 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={invitation.avatar_url || undefined} />
                      <AvatarFallback>
                        {invitation.display_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{invitation.display_name || 'Chưa đặt tên'}</p>
                      <p className="text-sm text-muted-foreground">{invitation.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      <Clock className="h-3 w-3 mr-1" />
                      Chờ xác nhận
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => cancelInvitation(invitation.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Danh sách Quản trị viên ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {admins.map((admin) => (
              <div 
                key={admin.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={admin.avatar_url || undefined} />
                    <AvatarFallback>
                      {admin.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{admin.display_name || 'Chưa đặt tên'}</p>
                      {getRoleBadge(admin.role)}
                    </div>
                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/user/${admin.user_id}`)}>
                      <User className="h-4 w-4 mr-2" />
                      Xem trang cá nhân
                    </DropdownMenuItem>
                    {isOwner && admin.role !== 'owner' && (
                      <DropdownMenuItem 
                        className="text-red-500 focus:text-red-500"
                        onClick={() => {
                          setAdminToRemove(admin);
                          setRemoveDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Xóa quyền Admin
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Remove Admin Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa quyền Quản trị viên?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa quyền admin của{" "}
              <span className="font-semibold">{adminToRemove?.display_name}</span>?
              <br />
              Người này sẽ mất tất cả quyền quản trị và sẽ được thông báo về việc này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeAdmin}
              disabled={removing}
              className="bg-red-500 hover:bg-red-600"
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Xóa quyền
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
