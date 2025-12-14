import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Check, X, UserPlus, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Link } from "react-router-dom";

interface FriendRequest {
  id: string;
  follower_id: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    profile_type: string;
    location: string | null;
  };
}

const profileTypeLabels: Record<string, { emoji: string; label: string }> = {
  farmer: { emoji: '🧑‍🌾', label: 'Nông dân' },
  fisher: { emoji: '🎣', label: 'Ngư dân' },
  eater: { emoji: '🍽️', label: 'Người ăn sạch' },
  restaurant: { emoji: '👨‍🍳', label: 'Nhà hàng' },
  distributor: { emoji: '📦', label: 'Nhà phân phối' },
  shipper: { emoji: '🚚', label: 'Shipper' },
};

export const FriendRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchRequests = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('followers')
        .select('id, follower_id, created_at')
        .eq('following_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const followerIds = data.map(r => r.follower_id);
        const { data: profiles } = await supabase
          .rpc('get_public_profiles', { user_ids: followerIds });

        const profilesMap: Record<string, any> = {};
        if (profiles) {
          profiles.forEach((p: any) => {
            profilesMap[p.id] = p;
          });
        }

        setRequests(data.map(r => ({
          ...r,
          profile: profilesMap[r.follower_id]
        })));
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user?.id]);

  // Realtime subscription for new friend requests
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('friend-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'followers',
          filter: `following_id=eq.${user.id}`
        },
        async (payload) => {
          const newRequest = payload.new as any;
          if (newRequest.status === 'pending') {
            // Fetch profile for new request
            const { data: profiles } = await supabase
              .rpc('get_public_profiles', { user_ids: [newRequest.follower_id] });
            
            const profile = profiles?.[0];
            setRequests(prev => [{
              id: newRequest.id,
              follower_id: newRequest.follower_id,
              created_at: newRequest.created_at,
              profile
            }, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'followers',
          filter: `following_id=eq.${user.id}`
        },
        (payload) => {
          const deleted = payload.old as any;
          setRequests(prev => prev.filter(r => r.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleAccept = async (request: FriendRequest) => {
    setProcessingIds(prev => new Set(prev).add(request.id));
    
    try {
      const { error } = await supabase
        .from('followers')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (error) throw error;

      setRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success(
        `Bạn và ${request.profile?.display_name || 'bạn ấy'} đã trở thành bạn bè! 🎉`,
        { description: '+10.000 CAMLY cho cả hai!' }
      );
    } catch (error: any) {
      toast.error('Không thể chấp nhận yêu cầu');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  const handleReject = async (request: FriendRequest) => {
    setProcessingIds(prev => new Set(prev).add(request.id));
    
    try {
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('id', request.id);

      if (error) throw error;

      setRequests(prev => prev.filter(r => r.id !== request.id));
      toast.info('Đã từ chối yêu cầu kết bạn');
    } catch (error: any) {
      toast.error('Không thể từ chối yêu cầu');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Không có yêu cầu kết bạn nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-primary" />
        Yêu cầu kết bạn ({requests.length})
      </h3>
      
      <div className="space-y-2">
        {requests.map((request) => {
          const roleInfo = profileTypeLabels[request.profile?.profile_type || 'eater'];
          const isProcessing = processingIds.has(request.id);
          
          return (
            <div 
              key={request.id} 
              className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border"
            >
              <Link to={`/user/${request.follower_id}`}>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={request.profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {roleInfo.emoji}
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              <div className="flex-1 min-w-0">
                <Link 
                  to={`/user/${request.follower_id}`}
                  className="font-medium text-foreground hover:underline block truncate"
                >
                  {request.profile?.display_name || 'FUN Farmer'}
                </Link>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>{roleInfo.emoji}</span>
                  <span>{roleInfo.label}</span>
                  {request.profile?.location && (
                    <>
                      <span>•</span>
                      <span className="truncate">{request.profile.location}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(request.created_at), {
                    addSuffix: true,
                    locale: vi
                  })}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(request)}
                  disabled={isProcessing}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Xác nhận
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(request)}
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
