import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Shield, Search, UserPlus, Trash2, Loader2 } from "lucide-react";
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

interface AdminManagementTabProps {
  currentUserId?: string;
  isOwner: boolean;
}

interface AdminUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: string;
}

interface SearchUser {
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

const AdminManagementTab = ({ currentUserId, isOwner }: AdminManagementTabProps) => {
  const [owner, setOwner] = useState<AdminUser | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Dialog states
  const [confirmAddDialog, setConfirmAddDialog] = useState<{ open: boolean; user: SearchUser | null }>({ open: false, user: null });
  const [confirmRemoveDialog, setConfirmRemoveDialog] = useState<{ open: boolean; admin: AdminUser | null }>({ open: false, admin: null });

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      
      // Fetch all users with admin or owner role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "owner"]);
      
      if (roleError) throw roleError;
      
      if (!roleData || roleData.length === 0) {
        setOwner(null);
        setAdmins([]);
        return;
      }
      
      // Fetch profiles for these users
      const userIds = roleData.map(r => r.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, email")
        .in("id", userIds);
      
      if (profileError) throw profileError;
      
      // Combine role and profile data
      const adminUsers: AdminUser[] = [];
      let ownerUser: AdminUser | null = null;
      
      roleData.forEach(role => {
        const profile = profiles?.find(p => p.id === role.user_id);
        if (profile) {
          const user: AdminUser = {
            id: profile.id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            email: profile.email,
            role: role.role
          };
          
          if (role.role === "owner") {
            ownerUser = user;
          } else {
            adminUsers.push(user);
          }
        }
      });
      
      setOwner(ownerUser);
      setAdmins(adminUsers);
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Không thể tải danh sách admin");
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

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setSearching(true);
      
      // Get existing admin/owner user IDs
      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "owner"]);
      
      const existingIds = existingRoles?.map(r => r.user_id) || [];
      
      // Search profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, email")
        .or(`display_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);
      
      if (error) throw error;
      
      // Filter out existing admins/owners
      const filtered = data?.filter(p => !existingIds.includes(p.id)) || [];
      setSearchResults(filtered);
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Lỗi tìm kiếm");
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
    const debounce = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);
    
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleAddAdmin = async (targetUser: SearchUser) => {
    if (!currentUserId) return;
    
    try {
      setActionLoading(targetUser.id);
      
      const { error } = await supabase.rpc("add_admin_role", {
        p_owner_id: currentUserId,
        p_target_user_id: targetUser.id
      });
      
      if (error) throw error;
      
      toast.success(`Đã thêm ${targetUser.display_name || "User"} làm Admin`);
      setSearchQuery("");
      setSearchResults([]);
      fetchAdmins();
    } catch (error: any) {
      console.error("Error adding admin:", error);
      toast.error(error.message || "Không thể thêm admin");
    } finally {
      setActionLoading(null);
      setConfirmAddDialog({ open: false, user: null });
    }
  };

  const handleRemoveAdmin = async (admin: AdminUser) => {
    if (!currentUserId) return;
    
    try {
      setActionLoading(admin.id);
      
      const { error } = await supabase.rpc("remove_admin_role", {
        p_owner_id: currentUserId,
        p_target_user_id: admin.id
      });
      
      if (error) throw error;
      
      toast.success(`Đã xóa quyền Admin của ${admin.display_name || "User"}`);
      fetchAdmins();
    } catch (error: any) {
      console.error("Error removing admin:", error);
      toast.error(error.message || "Không thể xóa admin");
    } finally {
      setActionLoading(null);
      setConfirmRemoveDialog({ open: false, admin: null });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
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
      {/* Owner Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-yellow-500" />
            Owner (Chủ sở hữu hệ thống)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {owner ? (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
              <Avatar className="h-12 w-12 ring-2 ring-yellow-500">
                <AvatarImage src={owner.avatar_url || undefined} />
                <AvatarFallback>{owner.display_name?.[0] || "O"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{owner.display_name || "No name"}</p>
                <p className="text-sm text-muted-foreground">{owner.email}</p>
              </div>
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                <Crown className="h-3 w-3 mr-1" />
                OWNER
              </Badge>
            </div>
          ) : (
            <p className="text-muted-foreground">Chưa có Owner</p>
          )}
        </CardContent>
      </Card>

      {/* Admins List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-blue-500" />
            Danh sách Admin ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {admins.length > 0 ? (
            <div className="space-y-3">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={admin.avatar_url || undefined} />
                    <AvatarFallback>{admin.display_name?.[0] || "A"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{admin.display_name || "No name"}</p>
                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                  </div>
                  {admin.id === currentUserId ? (
                    <Badge variant="outline">Bạn</Badge>
                  ) : isOwner ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmRemoveDialog({ open: true, admin })}
                      disabled={actionLoading === admin.id}
                    >
                      {actionLoading === admin.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Xóa
                        </>
                      )}
                    </Button>
                  ) : (
                    <Badge variant="secondary">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Chưa có Admin nào khác</p>
          )}
        </CardContent>
      </Card>

      {/* Add Admin Section - Only visible to Owner */}
      {isOwner ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5 text-green-500" />
              Thêm Admin mới
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {searching ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.display_name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.display_name || "No name"}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setConfirmAddDialog({ open: true, user })}
                      disabled={actionLoading === user.id}
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1" />
                          Thêm
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <p className="text-muted-foreground text-center py-4">Không tìm thấy user nào</p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              Chỉ <span className="font-semibold text-yellow-500">Owner</span> mới có quyền thêm/xóa Admin
            </p>
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

      {/* Confirm Add Dialog */}
      <AlertDialog open={confirmAddDialog.open} onOpenChange={(open) => !open && setConfirmAddDialog({ open: false, user: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận thêm Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn thêm <span className="font-semibold">{confirmAddDialog.user?.display_name || "User này"}</span> làm Admin?
              <br /><br />
              Admin sẽ có quyền truy cập vào trang quản trị và duyệt thưởng cho users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmAddDialog.user && handleAddAdmin(confirmAddDialog.user)}>
              Xác nhận thêm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Remove Dialog */}
      <AlertDialog open={confirmRemoveDialog.open} onOpenChange={(open) => !open && setConfirmRemoveDialog({ open: false, admin: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa quyền Admin của <span className="font-semibold">{confirmRemoveDialog.admin?.display_name || "User này"}</span>?
              <br /><br />
              Họ sẽ không còn quyền truy cập vào trang quản trị.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => confirmRemoveDialog.admin && handleRemoveAdmin(confirmRemoveDialog.admin)}
            >
              Xác nhận xóa
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
};

export default AdminManagementTab;
}
