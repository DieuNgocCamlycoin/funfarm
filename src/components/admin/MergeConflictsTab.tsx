import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertTriangle, Check, X, RefreshCw, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ConflictUser {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  camly_balance: number;
}

interface MergeConflict {
  id: string;
  user_id: string;
  user_email: string;
  conflicting_user_id: string | null;
  conflicting_user_email: string | null;
  fun_profile_id: string;
  fun_id: string | null;
  conflict_type: string;
  conflict_details: Record<string, unknown> | null;
  resolved: boolean;
  resolution_action: string | null;
  resolution_notes: string | null;
  created_at: string;
  user: ConflictUser | null;
  conflicting_user: ConflictUser | null;
}

type ResolutionAction = 'keep_existing' | 'replace_existing' | 'manual_merge' | 'dismissed';

export function MergeConflictsTab() {
  const [conflicts, setConflicts] = useState<MergeConflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<MergeConflict | null>(null);
  const [selectedAction, setSelectedAction] = useState<ResolutionAction | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const fetchConflicts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-conflicts', {
        body: { resolved: showResolved },
      });

      if (error) throw error;
      setConflicts(data.conflicts || []);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      toast.error('Không thể tải danh sách conflicts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, [showResolved]);

  const handleResolve = async () => {
    if (!selectedConflict || !selectedAction) return;

    setIsResolving(true);
    try {
      const { error } = await supabase.functions.invoke('admin-resolve-conflict', {
        body: {
          conflict_id: selectedConflict.id,
          action: selectedAction,
          notes: resolutionNotes || undefined,
        },
      });

      if (error) throw error;

      toast.success('Đã giải quyết conflict thành công');
      setSelectedConflict(null);
      setSelectedAction(null);
      setResolutionNotes('');
      fetchConflicts();
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error('Không thể giải quyết conflict');
    } finally {
      setIsResolving(false);
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'duplicate_fun_profile_id':
        return 'Trùng Fun Profile ID';
      case 'duplicate_fun_id':
        return 'Trùng Fun-ID';
      case 'duplicate_email':
        return 'Trùng Email';
      default:
        return type;
    }
  };

  const UserCard = ({ user, label }: { user: ConflictUser | null; label: string }) => (
    <div className="p-3 rounded-lg bg-muted/50 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {user ? (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar_url || ''} />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{user.display_name || 'Chưa đặt tên'}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <p className="text-xs text-amber-600">{user.camly_balance.toLocaleString()} CAMLY</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Không có thông tin</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={showResolved ? 'outline' : 'default'}
            size="sm"
            onClick={() => setShowResolved(false)}
          >
            Chưa giải quyết
          </Button>
          <Button
            variant={showResolved ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowResolved(true)}
          >
            Đã giải quyết
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={fetchConflicts} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : conflicts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {showResolved ? 'Không có conflicts đã giải quyết' : 'Không có conflicts cần giải quyết'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <Card key={conflict.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      {getConflictTypeLabel(conflict.conflict_type)}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(conflict.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </CardDescription>
                  </div>
                  <Badge variant={conflict.resolved ? 'secondary' : 'destructive'}>
                    {conflict.resolved ? 'Đã xử lý' : 'Chờ xử lý'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UserCard user={conflict.user} label="User yêu cầu merge" />
                  <UserCard user={conflict.conflicting_user} label="User đang giữ Fun Profile ID" />
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Fun Profile ID: </span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {conflict.fun_profile_id}
                  </code>
                </div>

                {conflict.resolved && conflict.resolution_action && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                    <p className="text-sm">
                      <span className="font-medium">Hành động: </span>
                      {conflict.resolution_action === 'keep_existing' && 'Giữ nguyên user hiện tại'}
                      {conflict.resolution_action === 'replace_existing' && 'Thay thế bằng user mới'}
                      {conflict.resolution_action === 'manual_merge' && 'Xử lý thủ công'}
                      {conflict.resolution_action === 'dismissed' && 'Bỏ qua'}
                    </p>
                    {conflict.resolution_notes && (
                      <p className="text-sm text-muted-foreground mt-1">{conflict.resolution_notes}</p>
                    )}
                  </div>
                )}

                {!conflict.resolved && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedConflict(conflict);
                        setSelectedAction('keep_existing');
                      }}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Giữ nguyên
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedConflict(conflict);
                        setSelectedAction('replace_existing');
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Thay thế
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedConflict(conflict);
                        setSelectedAction('dismissed');
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Bỏ qua
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resolution Dialog */}
      <Dialog open={!!selectedConflict} onOpenChange={() => setSelectedConflict(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận giải quyết conflict</DialogTitle>
            <DialogDescription>
              {selectedAction === 'keep_existing' &&
                'User hiện tại sẽ giữ nguyên Fun Profile ID. User yêu cầu merge sẽ không được link.'}
              {selectedAction === 'replace_existing' &&
                'User hiện tại sẽ bị gỡ Fun Profile ID. User yêu cầu merge sẽ được link thay thế.'}
              {selectedAction === 'dismissed' &&
                'Conflict sẽ được đánh dấu là đã xử lý nhưng không có thay đổi nào được thực hiện.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ghi chú (tùy chọn)</label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Nhập lý do hoặc ghi chú..."
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedConflict(null)}>
              Hủy
            </Button>
            <Button onClick={handleResolve} disabled={isResolving}>
              {isResolving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
