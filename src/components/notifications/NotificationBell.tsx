import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  from_user_id: string | null;
  post_id: string | null;
  content: string;
  read: boolean;
  created_at: string;
  from_user?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch from_user profiles
      const fromUserIds = [...new Set(data?.filter(n => n.from_user_id).map(n => n.from_user_id) || [])];
      
      let profilesMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      
      if (fromUserIds.length > 0) {
        const { data: profiles } = await supabase
          .rpc('get_public_profiles', { user_ids: fromUserIds });
        
        if (profiles) {
          profiles.forEach((p: any) => {
            profilesMap[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
          });
        }
      }

      const notificationsWithUsers = data?.map(n => ({
        ...n,
        from_user: n.from_user_id ? profilesMap[n.from_user_id] : undefined
      })) || [];

      setNotifications(notificationsWithUsers);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    setIsOpen(false);

    // Navigate based on notification type
    if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
      if (notification.from_user_id) {
        navigate(`/user/${notification.from_user_id}`);
      }
    } else if (notification.post_id) {
      // For post-related notifications, navigate to feed (could be improved to scroll to specific post)
      navigate('/feed');
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'post_like': return '❤️';
      case 'comment': return '💬';
      case 'share': return '🔄';
      case 'friend_request': return '👋';
      case 'friend_accepted': return '🎉';
      default: return '🔔';
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const newNotification = payload.new as Notification;
          
          // Fetch from_user profile
          if (newNotification.from_user_id) {
            const { data: profiles } = await supabase
              .rpc('get_public_profiles', { user_ids: [newNotification.from_user_id] });
            
            if (profiles && profiles[0]) {
              newNotification.from_user = {
                display_name: profiles[0].display_name,
                avatar_url: profiles[0].avatar_url
              };
            }
          }

          setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Refresh when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0 bg-card border-border" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Thông báo</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary/80"
              onClick={markAllAsRead}
            >
              Đánh dấu đã đọc
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Chưa có thông báo nào</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors text-left",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={notification.from_user?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {notification.from_user?.display_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-1 -right-1 text-sm">
                      {getNotificationIcon(notification.type)}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm text-foreground line-clamp-2",
                      !notification.read && "font-medium"
                    )}>
                      {notification.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: vi
                      })}
                    </p>
                  </div>
                  
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
