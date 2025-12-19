import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, UserPlus, Loader2, Check, Clock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const profileTypeLabels: Record<string, { emoji: string; label: string }> = {
  farmer: { emoji: '🧑‍🌾', label: 'Nông dân' },
  fisher: { emoji: '🎣', label: 'Ngư dân' },
  eater: { emoji: '🍽️', label: 'Người ăn sạch' },
  restaurant: { emoji: '👨‍🍳', label: 'Nhà hàng' },
  distributor: { emoji: '📦', label: 'Nhà phân phối' },
  shipper: { emoji: '🚚', label: 'Shipper' },
};

interface SearchResult {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  profile_type: string;
  bio: string | null;
  is_verified: boolean;
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
}

interface FriendSearchProps {
  compact?: boolean;
}

export function FriendSearch({ compact = false }: FriendSearchProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [profileType, setProfileType] = useState<string>("all");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

  // Search function
  const handleSearch = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const trimmedQuery = searchQuery.trim();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedQuery);

      let query = supabase
        .from('profiles')
        .select('id, display_name, avatar_url, location, profile_type, bio, is_verified')
        .neq('id', user.id)
        .limit(20);

      // Filter by UID or name
      if (trimmedQuery) {
        if (isUUID) {
          query = query.eq('id', trimmedQuery);
        } else {
          query = query.ilike('display_name', `%${trimmedQuery}%`);
        }
      }

      // Filter by profile type
      if (profileType && profileType !== 'all') {
        query = query.eq('profile_type', profileType as any);
      }

      // Filter by location
      if (location.trim()) {
        query = query.ilike('location', `%${location.trim()}%`);
      }

      const { data: profiles, error } = await query;

      if (error) throw error;

      // Get friendship statuses for all results
      const profileIds = profiles?.map(p => p.id) || [];
      
      const { data: friendships } = await supabase
        .from('followers')
        .select('follower_id, following_id, status')
        .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`)
        .in('follower_id', [...profileIds, user.id])
        .in('following_id', [...profileIds, user.id]);

      // Map results with friendship status
      const resultsWithStatus: SearchResult[] = (profiles || []).map(profile => {
        let friendshipStatus: SearchResult['friendshipStatus'] = 'none';
        
        const friendship = friendships?.find(
          f => (f.follower_id === user.id && f.following_id === profile.id) ||
               (f.follower_id === profile.id && f.following_id === user.id)
        );

        if (friendship) {
          if (friendship.status === 'accepted') {
            friendshipStatus = 'accepted';
          } else if (friendship.status === 'pending') {
            if (friendship.follower_id === user.id) {
              friendshipStatus = 'pending_sent';
            } else {
              friendshipStatus = 'pending_received';
            }
          }
        }

        return {
          ...profile,
          friendshipStatus
        };
      });

      setResults(resultsWithStatus);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Có lỗi khi tìm kiếm');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery || profileType !== 'all' || location) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, profileType, location]);

  // Send friend request
  const sendFriendRequest = async (targetId: string) => {
    if (!user?.id) return;
    
    setLoadingActions(prev => ({ ...prev, [targetId]: true }));
    try {
      const { error } = await supabase
        .from('followers')
        .insert({
          follower_id: user.id,
          following_id: targetId,
          status: 'pending'
        });

      if (error) throw error;

      setResults(prev => prev.map(r => 
        r.id === targetId ? { ...r, friendshipStatus: 'pending_sent' as const } : r
      ));
      toast.success('Đã gửi lời mời kết bạn');
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Không thể gửi lời mời');
    } finally {
      setLoadingActions(prev => ({ ...prev, [targetId]: false }));
    }
  };

  // Cancel friend request
  const cancelFriendRequest = async (targetId: string) => {
    if (!user?.id) return;
    
    setLoadingActions(prev => ({ ...prev, [targetId]: true }));
    try {
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetId);

      if (error) throw error;

      setResults(prev => prev.map(r => 
        r.id === targetId ? { ...r, friendshipStatus: 'none' as const } : r
      ));
      toast.success('Đã hủy lời mời');
    } catch (error) {
      console.error('Error canceling request:', error);
      toast.error('Không thể hủy lời mời');
    } finally {
      setLoadingActions(prev => ({ ...prev, [targetId]: false }));
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (targetId: string) => {
    if (!user?.id) return;
    
    setLoadingActions(prev => ({ ...prev, [targetId]: true }));
    try {
      const { error } = await supabase
        .from('followers')
        .update({ status: 'accepted' })
        .eq('follower_id', targetId)
        .eq('following_id', user.id);

      if (error) throw error;

      setResults(prev => prev.map(r => 
        r.id === targetId ? { ...r, friendshipStatus: 'accepted' as const } : r
      ));
      toast.success('Đã chấp nhận kết bạn! +10.000 CAMLY 🎉');
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Không thể chấp nhận');
    } finally {
      setLoadingActions(prev => ({ ...prev, [targetId]: false }));
    }
  };

  const renderActionButton = (result: SearchResult) => {
    const isLoading = loadingActions[result.id];

    switch (result.friendshipStatus) {
      case 'accepted':
        return (
          <Button variant="secondary" size="sm" disabled className="gap-1">
            <Check className="w-4 h-4" />
            Bạn bè
          </Button>
        );
      case 'pending_sent':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => cancelFriendRequest(result.id)}
            disabled={isLoading}
            className="gap-1"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
            Đã gửi
          </Button>
        );
      case 'pending_received':
        return (
          <Button 
            size="sm" 
            onClick={() => acceptFriendRequest(result.id)}
            disabled={isLoading}
            className="gap-1 bg-primary"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Chấp nhận
          </Button>
        );
      default:
        return (
          <Button 
            size="sm" 
            onClick={() => sendFriendRequest(result.id)}
            disabled={isLoading}
            className="gap-1 bg-primary"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Kết bạn
          </Button>
        );
    }
  };

  return (
    <div className={compact ? "" : "bg-card rounded-xl border border-border p-4"}>
      {!compact && (
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Tìm kiếm bạn bè
        </h3>
      )}

      {/* Search Filters */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc UID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Select value={profileType} onValueChange={setProfileType}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Loại thành viên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {Object.entries(profileTypeLabels).map(([key, { emoji, label }]) => (
                <SelectItem key={key} value={key}>
                  {emoji} {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Vị trí..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Search Results */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {results.map((result) => {
            const roleInfo = profileTypeLabels[result.profile_type] || profileTypeLabels.eater;
            return (
              <div 
                key={result.id} 
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Avatar 
                  className="w-12 h-12 cursor-pointer" 
                  onClick={() => navigate(`/user/${result.id}`)}
                >
                  <AvatarImage src={result.avatar_url || undefined} />
                  <AvatarFallback>{roleInfo.emoji}</AvatarFallback>
                </Avatar>

                <div 
                  className="flex-1 min-w-0 cursor-pointer" 
                  onClick={() => navigate(`/user/${result.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {result.display_name || 'FUN Farmer'}
                    </span>
                    {result.is_verified && (
                      <Badge variant="secondary" className="text-xs">✓</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{roleInfo.emoji} {roleInfo.label}</span>
                    {result.location && (
                      <>
                        <span>•</span>
                        <span className="truncate">{result.location}</span>
                      </>
                    )}
                  </div>
                </div>

                {renderActionButton(result)}
              </div>
            );
          })}
        </div>
      ) : (searchQuery || profileType !== 'all' || location) ? (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Không tìm thấy kết quả</p>
          <p className="text-sm">Thử tìm với từ khóa khác</p>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nhập tên, UID, chọn loại thành viên hoặc vị trí để tìm bạn bè</p>
        </div>
      )}
    </div>
  );
}
