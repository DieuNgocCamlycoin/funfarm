import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  MessageSquare,
  FileText,
  Search,
  ExternalLink,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface RejectedContent {
  id: string;
  user_id: string;
  content: string;
  content_type: string;
  rejection_reason: string | null;
  images: string[] | null;
  post_id: string | null;
  metadata: any;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const ContentModerationTab = () => {
  const { user } = useAuth();
  const [rejectedContent, setRejectedContent] = useState<RejectedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  useEffect(() => {
    fetchRejectedContent();
  }, [statusFilter]);

  const fetchRejectedContent = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('rejected_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter === 'pending') {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const enrichedData = (data || []).map(item => ({
        ...item,
        profile: profiles?.find(p => p.id === item.user_id)
      }));

      setRejectedContent(enrichedData);

      // Calculate stats
      const allData = await supabase
        .from('rejected_content')
        .select('status');
      
      const statData = allData.data || [];
      setStats({
        pending: statData.filter(d => d.status === 'pending').length,
        approved: statData.filter(d => d.status === 'approved').length,
        rejected: statData.filter(d => d.status === 'confirmed_rejected').length,
        total: statData.length
      });

    } catch (error) {
      console.error('Error fetching rejected content:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveContent = async (item: RejectedContent) => {
    setProcessingId(item.id);
    try {
      // Insert the content as a post or comment
      if (item.content_type === 'post') {
        const { error: postError } = await supabase
          .from('posts')
          .insert({
            author_id: item.user_id,
            content: item.content,
            images: item.images,
            post_type: 'post'
          });

        if (postError) throw postError;
      } else if (item.content_type === 'comment' && item.post_id) {
        const { error: commentError } = await supabase
          .from('comments')
          .insert({
            post_id: item.post_id,
            author_id: item.user_id,
            content: item.content
          });

        if (commentError) throw commentError;
      }

      // Update status
      const { error: updateError } = await supabase
        .from('rejected_content')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: item.user_id,
        type: 'content_approved',
        content: `${item.content_type === 'post' ? 'Bài viết' : 'Bình luận'} của bạn đã được duyệt và đăng! 🎉`
      });

      toast.success('Đã approve và đăng nội dung!');
      fetchRejectedContent();
    } catch (error: any) {
      console.error('Error approving content:', error);
      toast.error(error.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async (item: RejectedContent) => {
    setProcessingId(item.id);
    try {
      const { error } = await supabase
        .from('rejected_content')
        .update({
          status: 'confirmed_rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;

      toast.success('Đã xác nhận từ chối nội dung');
      fetchRejectedContent();
    } catch (error) {
      console.error('Error rejecting content:', error);
      toast.error('Có lỗi xảy ra');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredContent = rejectedContent.filter(item =>
    item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Kiểm Duyệt Nội Dung</h2>
            <p className="text-sm text-muted-foreground">Review bài viết/bình luận bị AI từ chối</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRejectedContent}>
          <Loader2 className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Chờ review</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Đã approve</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 text-center">
            <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">Xác nhận từ chối</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Tổng cộng</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo nội dung hoặc tên người dùng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'pending' | 'all')}>
          <TabsList>
            <TabsTrigger value="pending">Chờ review</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredContent.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Không có nội dung chờ review</h3>
          <p className="text-muted-foreground">Tất cả nội dung đã được xử lý!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredContent.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={item.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {item.profile?.display_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {item.profile?.display_name || 'Người dùng ẩn danh'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatTimeAgo(item.created_at)}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.content_type === 'post' ? (
                            <><FileText className="h-3 w-3 mr-1" /> Bài viết</>
                          ) : (
                            <><MessageSquare className="h-3 w-3 mr-1" /> Bình luận</>
                          )}
                        </Badge>
                        {item.status === 'approved' && (
                          <Badge className="bg-green-500/20 text-green-600 text-xs">Đã duyệt</Badge>
                        )}
                        {item.status === 'confirmed_rejected' && (
                          <Badge className="bg-red-500/20 text-red-600 text-xs">Đã xác nhận từ chối</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.open(`/user/${item.user_id}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Content */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-wrap">{item.content}</p>
                  {item.images && item.images.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {item.images.slice(0, 4).map((img, idx) => (
                        <img 
                          key={idx} 
                          src={img} 
                          alt={`Image ${idx + 1}`}
                          className="h-20 w-20 object-cover rounded-lg"
                        />
                      ))}
                      {item.images.length > 4 && (
                        <div className="h-20 w-20 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                          +{item.images.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Rejection Reason */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-600">Lý do AI từ chối:</p>
                      <p className="text-sm text-foreground mt-1">{item.rejection_reason || 'Không rõ lý do'}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {item.status === 'pending' && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApproveContent(item)}
                      disabled={processingId === item.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processingId === item.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Approve & Đăng {item.content_type === 'post' ? 'bài' : 'comment'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleConfirmReject(item)}
                      disabled={processingId === item.id}
                      className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Xác nhận từ chối
                    </Button>
                  </div>
                )}

                {/* Review info */}
                {item.reviewed_at && (
                  <p className="text-xs text-muted-foreground text-right">
                    Reviewed: {format(new Date(item.reviewed_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentModerationTab;
