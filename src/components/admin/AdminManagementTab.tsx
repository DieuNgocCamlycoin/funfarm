import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Shield, Search, UserPlus, Trash2, Loader2 } from "lucide-react";
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
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
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
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminManagementTab;
