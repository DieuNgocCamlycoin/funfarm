import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Gift,
  Clock,
  Ban,
  Eye,
  Loader2
} from "lucide-react";

interface BonusRequest {
  id: string;
  post_id: string;
  user_id: string;
  status: string;
  bonus_amount: number;
  created_at: string;
  post?: {
    content: string;
    images: string[];
    location_address: string;
  };
  profile?: {
    display_name: string;
    avatar_url: string;
  };
}

interface Violation {
  id: string;
  user_id: string;
  violation_type: string;
  violation_count: number;
  details: any;
  created_at: string;
  profile?: {
    display_name: string;
  };
}

interface UserWithViolation {
  id: string;
  display_name: string;
  avatar_url: string;
  violation_level: number;
  pending_reward: number;
  last_violation_at: string;
  is_good_heart: boolean;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bonusRequests, setBonusRequests] = useState<BonusRequest[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [flaggedUsers, setFlaggedUsers] = useState<UserWithViolation[]>([]);
  const [activeTab, setActiveTab] = useState("bonus");

  // Check admin role
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.id) {
        navigate('/auth');
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!data) {
        toast.error('Bạn không có quyền truy cập trang này');
        navigate('/feed');
        return;
      }

      setIsAdmin(true);
      setIsLoading(false);
    };

    checkAdmin();
  }, [user?.id, navigate]);

  // Fetch data
  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      // Fetch pending bonus requests
      const { data: requests } = await supabase
        .from('bonus_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requests) {
        // Fetch related posts and profiles
        const postIds = requests.map(r => r.post_id);
        const userIds = requests.map(r => r.user_id);

        const { data: posts } = await supabase
          .from('posts')
          .select('id, content, images, location_address')
          .in('id', postIds);

        const { data: profiles } = await supabase.rpc('get_public_profiles', { user_ids: userIds });

        const enrichedRequests = requests.map(r => ({
          ...r,
          post: posts?.find(p => p.id === r.post_id),
          profile: profiles?.find((p: any) => p.id === r.user_id)
        }));

        setBonusRequests(enrichedRequests);
      }

      // Fetch recent violations
      const { data: violationsData } = await supabase
        .from('user_violations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (violationsData) {
        const userIds = violationsData.map(v => v.user_id);
        const { data: profiles } = await supabase.rpc('get_public_profiles', { user_ids: userIds });

        const enrichedViolations = violationsData.map(v => ({
          ...v,
          profile: profiles?.find((p: any) => p.id === v.user_id)
        }));

        setViolations(enrichedViolations);
      }

      // Fetch flagged users (violation_level > 0)
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, violation_level, pending_reward, last_violation_at, is_good_heart')
        .gt('violation_level', 0)
        .order('violation_level', { ascending: false });

      if (usersData) {
        setFlaggedUsers(usersData);
      }
    };

    fetchData();
  }, [isAdmin]);

  const handleApproveBonus = async (request: BonusRequest) => {
    try {
      const bonusAmount = 5000; // +50% of base 10000

      // Update request status
      await supabase
        .from('bonus_requests')
        .update({ 
          status: 'approved', 
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          bonus_amount: bonusAmount
        })
        .eq('id', request.id);

      // Add bonus to user
      await supabase.rpc('add_camly_reward', { 
        user_id: request.user_id, 
        amount: bonusAmount 
      });

      setBonusRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success(`Đã duyệt bonus +${bonusAmount.toLocaleString()} CAMLY!`);
    } catch (error) {
      console.error('Error approving bonus:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleRejectBonus = async (request: BonusRequest) => {
    try {
      await supabase
        .from('bonus_requests')
        .update({ 
          status: 'rejected', 
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      setBonusRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success('Đã từ chối yêu cầu bonus');
    } catch (error) {
      console.error('Error rejecting bonus:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      // Remove active bans
      await supabase
        .from('reward_bans')
        .delete()
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString());

      // Reset violation level
      await supabase
        .from('profiles')
        .update({ violation_level: 0, last_violation_at: null })
        .eq('id', userId);

      setFlaggedUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('Đã gỡ lệnh cấm cho người dùng');
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Đang chờ duyệt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{bonusRequests.length}</div>
                <p className="text-xs text-muted-foreground">yêu cầu bonus</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vi phạm hôm nay</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {violations.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString()).length}
                </div>
                <p className="text-xs text-muted-foreground">trường hợp</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Đang bị cấm</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{flaggedUsers.length}</div>
                <p className="text-xs text-muted-foreground">người dùng</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="bonus" className="gap-2">
                <Gift className="w-4 h-4" />
                Duyệt Bonus ({bonusRequests.length})
              </TabsTrigger>
              <TabsTrigger value="violations" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                Vi phạm ({violations.length})
              </TabsTrigger>
              <TabsTrigger value="banned" className="gap-2">
                <Ban className="w-4 h-4" />
                Bị cấm ({flaggedUsers.length})
              </TabsTrigger>
            </TabsList>

            {/* Bonus Requests Tab */}
            <TabsContent value="bonus" className="space-y-4 mt-4">
              {bonusRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Không có yêu cầu bonus nào đang chờ</p>
                  </CardContent>
                </Card>
              ) : (
                bonusRequests.map(request => (
                  <Card key={request.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={request.profile?.avatar_url || '/placeholder.svg'} 
                            alt="" 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <CardTitle className="text-base">{request.profile?.display_name || 'Người dùng'}</CardTitle>
                            <CardDescription>
                              {new Date(request.created_at).toLocaleString('vi-VN')}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          +50% Bonus
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 rounded-lg p-3 mb-4">
                        <p className="text-sm line-clamp-3">{request.post?.content}</p>
                        {request.post?.location_address && (
                          <p className="text-xs text-muted-foreground mt-2">📍 {request.post.location_address}</p>
                        )}
                        {request.post?.images?.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {request.post.images.slice(0, 3).map((img, i) => (
                              <img key={i} src={img} alt="" className="w-16 h-16 rounded object-cover" />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 gap-2" 
                          onClick={() => handleApproveBonus(request)}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Duyệt (+5.000 CAMLY)
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 gap-2"
                          onClick={() => handleRejectBonus(request)}
                        >
                          <XCircle className="w-4 h-4" />
                          Từ chối
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Violations Tab */}
            <TabsContent value="violations" className="space-y-2 mt-4">
              {violations.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50 text-green-500" />
                    <p>Không có vi phạm nào gần đây</p>
                  </CardContent>
                </Card>
              ) : (
                violations.map(violation => (
                  <Card key={violation.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="font-medium">{violation.profile?.display_name || 'Người dùng'}</p>
                          <p className="text-sm text-muted-foreground">
                            {violation.violation_type} • {new Date(violation.created_at).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive">Lần {violation.violation_count}</Badge>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Banned Users Tab */}
            <TabsContent value="banned" className="space-y-2 mt-4">
              {flaggedUsers.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Không có người dùng nào đang bị cấm</p>
                  </CardContent>
                </Card>
              ) : (
                flaggedUsers.map(u => (
                  <Card key={u.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={u.avatar_url || '/placeholder.svg'} 
                          alt="" 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium">{u.display_name || 'Người dùng'}</p>
                          <p className="text-sm text-muted-foreground">
                            Vi phạm lần {u.violation_level} • Pending: {u.pending_reward.toLocaleString()} CAMLY
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={u.violation_level >= 3 ? "destructive" : "outline"}
                          className={u.violation_level >= 3 ? "" : "bg-orange-500/10 text-orange-500"}
                        >
                          {u.violation_level >= 3 ? "Vĩnh viễn" : `${u.violation_level === 1 ? '7' : '30'} ngày`}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUnbanUser(u.id)}
                        >
                          Gỡ cấm
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Admin;
