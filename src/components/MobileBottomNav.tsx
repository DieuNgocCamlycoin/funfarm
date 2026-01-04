// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Mobile Bottom Navigation - Facebook style

import { Link, useLocation } from "react-router-dom";
import { Home, User, Bell, Gift, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const profileTypeEmojis: Record<string, string> = {
  farmer: '🧑‍🌾',
  fisher: '🎣',
  eater: '🍽️',
  restaurant: '👨‍🍳',
  distributor: '📦',
  shipper: '🚚',
};

const MobileBottomNav = () => {
  const location = useLocation();
  const { user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notifications count
  useEffect(() => {
    if (!user?.id) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      setUnreadCount(count || 0);
    };

    fetchUnread();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('mobile-nav-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Don't render if not logged in
  if (!user || !profile) return null;

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      path: '/',
      icon: Home,
      label: 'Trang chủ',
      active: isActive('/'),
    },
    {
      path: '/wallet',
      icon: Gift,
      label: 'Ví & Quà',
      active: isActive('/wallet'),
      highlight: true,
    },
    {
      path: '/notifications',
      icon: Bell,
      label: 'Thông báo',
      active: isActive('/notifications'),
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      path: '/profile',
      icon: User,
      label: 'Cá nhân',
      active: isActive('/profile'),
      isProfile: true,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9998] md:hidden bg-background/95 backdrop-blur-md border-t border-border/50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
              item.active
                ? 'text-primary'
                : item.highlight
                ? 'text-amber-600'
                : 'text-muted-foreground'
            }`}
          >
            {/* Active indicator bar */}
            {item.active && (
              <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-b-full" />
            )}

            {/* Icon with badge */}
            <div className="relative">
              {item.isProfile ? (
                <Avatar className={`h-6 w-6 ${item.active ? 'ring-2 ring-primary' : ''}`}>
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10">
                    {profileTypeEmojis[profile.profile_type] || '🌱'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <item.icon className={`w-5 h-5 ${item.active ? 'fill-primary/20' : ''}`} />
              )}

              {/* Notification badge */}
              {item.badge && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>

            {/* Label */}
            <span className={`text-[10px] mt-0.5 font-medium ${item.active ? 'font-semibold' : ''}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
