// 🌱 Mobile Bottom Navigation - 5 tab social + commerce
import { Link, useLocation } from "react-router-dom";
import { Home, Sprout, ShoppingCart, User, Plus, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { CreateActionSheet } from "@/components/create/CreateActionSheet";

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
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

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

  if (!user || !profile) return null;

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/farm', icon: Sprout, label: 'Farm' },
    { path: '/market', icon: ShoppingCart, label: 'Market' },
    { path: '/profile', icon: User, label: 'Me', isProfile: true },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[9998] md:hidden bg-background/95 backdrop-blur-md border-t border-border/50 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors relative",
                isActive(item.path) ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {isActive(item.path) && (
                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-b-full" />
              )}

              {item.isProfile ? (
                <Avatar className={cn("h-6 w-6", isActive(item.path) && 'ring-2 ring-primary')}>
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10">
                    {profileTypeEmojis[profile.profile_type] || '🌱'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <item.icon className={cn("w-5 h-5", isActive(item.path) && 'fill-primary/20')} />
              )}

              <span className={cn("text-[10px] mt-1 font-medium", isActive(item.path) && 'font-semibold')}>
                {item.label}
              </span>
            </Link>
          ))}

          {/* Center + button */}
          <button
            onClick={() => setActionSheetOpen(true)}
            className={cn(
              "relative flex flex-col items-center justify-center -mt-5",
              "w-14 h-14 rounded-full shadow-lg",
              "bg-gradient-to-br from-primary via-secondary to-accent",
              "hover:shadow-xl transition-all duration-300 active:scale-95"
            )}
            aria-label="Tạo mới"
          >
            <Plus className="w-7 h-7 text-primary-foreground" />
            <span className="text-[10px] mt-0.5 font-medium text-primary-foreground">Tạo</span>
          </button>
        </div>
      </nav>

      <CreateActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        onSelect={(action) => {
          // Action sheet will be wired to CreatePostModal in parent components
          window.dispatchEvent(
            new CustomEvent('open-create-post', {
              detail: { postKind: action.kind, isSelling: action.isSelling },
            })
          );
        }}
      />
    </>
  );
};

export default MobileBottomNav;
