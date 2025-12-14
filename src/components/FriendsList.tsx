import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Users, UserMinus, Loader2, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface Friend {
  id: string;
  friend_id: string;
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

export const FriendsList = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unfriendingIds, setUnfriendingIds] = useState<Set<string>>(new Set());

  const fetchFriends = async () => {
    if (!user?.id) return;
    
    try {
      // Get friends where user is follower_id
      const { data: asFollower, error: error1 } = await supabase
        .from('followers')
        .select('id, following_id, created_at')
        .eq('follower_id', user.id)
        .eq('status', 'accepted');

      // Get friends where user is following_id
      const { data: asFollowing, error: error2 } = await supabase
        .from('followers')
        .select('id, follower_id, created_at')
        .eq('following_id', user.id)
        .eq('status', 'accepted');

      if (error1) throw error1;
      if (error2) throw error2;

      const allFriends: { id: string; friend_id: string; created_at: string }[] = [];
      
      asFollower?.forEach(f => {
        allFriends.push({ id: f.id, friend_id: f.following_id, created_at: f.created_at });
      });
      
      asFollowing?.forEach(f => {
        allFriends.push({ id: f.id, friend_id: f.follower_id, created_at: f.created_at });
      });

      if (allFriends.length > 0) {
        const friendIds = [...new Set(allFriends.map(f => f.friend_id))];
        const { data: profiles } = await supabase
          .rpc('get_public_profiles', { user_ids: friendIds });

        const profilesMap: Record<string, any> = {};
        if (profiles) {
          profiles.forEach((p: any) => {
            profilesMap[p.id] = p;
          });
        }

        // Remove duplicates (same friend_id)
        const uniqueFriends = allFriends.reduce((acc, f) => {
          if (!acc.find(x => x.friend_id === f.friend_id)) {
            acc.push({
              ...f,
              profile: profilesMap[f.friend_id]
            });
          }
          return acc;
        }, [] as Friend[]);

        setFriends(uniqueFriends);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [user?.id]);

  // Realtime subscription for friendship changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('friends-list-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers'
        },
        (payload) => {
          // Refresh the list when any change happens
          fetchFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleUnfriend = async (friend: Friend) => {
    setUnfriendingIds(prev => new Set(prev).add(friend.id));
    
    try {
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('id', friend.id);

      if (error) throw error;

      setFriends(prev => prev.filter(f => f.id !== friend.id));
      toast.info(`Đã hủy kết bạn với ${friend.profile?.display_name || 'bạn ấy'}`);
    } catch (error: any) {
      toast.error('Không thể hủy kết bạn');
    } finally {
      setUnfriendingIds(prev => {
        const next = new Set(prev);
        next.delete(friend.id);
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

  if (friends.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Bạn chưa có bạn bè nào</p>
        <p className="text-sm mt-1">Hãy kết nối với cộng đồng FUN FARM!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        Bạn bè ({friends.length})
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {friends.map((friend) => {
          const roleInfo = profileTypeLabels[friend.profile?.profile_type || 'eater'];
          const isUnfriending = unfriendingIds.has(friend.id);
          
          return (
            <div 
              key={friend.id} 
              className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border"
            >
              <Link to={`/user/${friend.friend_id}`}>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={friend.profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {roleInfo.emoji}
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              <div className="flex-1 min-w-0">
                <Link 
                  to={`/user/${friend.friend_id}`}
                  className="font-medium text-foreground hover:underline block truncate"
                >
                  {friend.profile?.display_name || 'FUN Farmer'}
                </Link>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>{roleInfo.emoji}</span>
                  <span>{roleInfo.label}</span>
                </div>
              </div>
              
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title="Nhắn tin"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleUnfriend(friend)}
                  disabled={isUnfriending}
                  title="Hủy kết bạn"
                >
                  {isUnfriending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserMinus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
