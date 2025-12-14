import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useRealtimeNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Listen for violation warnings
    const violationsChannel = supabase
      .channel('user-violations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_violations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const violation = payload.new as any;
          const level = violation.violation_count || 1;
          
          if (level === 1) {
            toast.warning(
              'Bạn ơi, hãy lan tỏa tình yêu chân thành nhé ❤️',
              { 
                duration: 6000,
                description: 'Tài khoản bị tạm ngưng thưởng 7 ngày'
              }
            );
          } else if (level === 2) {
            toast.error(
              'Cảnh báo vi phạm lần 2',
              { 
                duration: 8000,
                description: 'Tài khoản bị tạm ngưng thưởng 30 ngày'
              }
            );
          } else {
            toast.error(
              'FUN FARM chỉ dành cho trái tim lương thiện',
              { 
                duration: 10000,
                description: 'Tài khoản của bạn đã bị khóa vĩnh viễn vì lạm dụng'
              }
            );
          }
        }
      )
      .subscribe();

    // Listen for bonus request updates
    const bonusChannel = supabase
      .channel('bonus-requests')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bonus_requests',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const request = payload.new as any;
          
          if (request.status === 'approved') {
            toast.success(
              '🎉 Bài viết của bạn đã được duyệt bonus +50%!',
              { 
                duration: 6000,
                description: `+${(request.bonus_amount || 5000).toLocaleString()} CAMLY đã được cộng vào tài khoản`
              }
            );
          } else if (request.status === 'rejected') {
            toast.info(
              'Cảm ơn bạn đã gửi bài!',
              { 
                duration: 5000,
                description: 'Lần sau kể thêm câu chuyện từ trái tim để nhận bonus nhé ❤️'
              }
            );
          }
        }
      )
      .subscribe();

    // Listen for good heart badge
    const profileChannel = supabase
      .channel('profile-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const oldProfile = payload.old as any;
          const newProfile = payload.new as any;
          
          // Check if user just got good heart badge
          if (!oldProfile.is_good_heart && newProfile.is_good_heart) {
            toast.success(
              '💖 Chúc mừng! Bạn đã nhận huy hiệu "Trái tim lương thiện"!',
              { 
                duration: 8000,
                description: 'Cảm ơn bạn đã lan tỏa tình yêu chân thành trong 30 ngày qua'
              }
            );
          }
        }
      )
      .subscribe();

    // Listen for friendship status changes (realtime friend updates)
    const friendshipChannel = supabase
      .channel('friendship-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'followers',
          filter: `follower_id=eq.${user.id}`
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          // When someone accepts our friend request
          if (oldData.status === 'pending' && newData.status === 'accepted') {
            toast.success(
              '🎉 Yêu cầu kết bạn đã được chấp nhận!',
              { 
                duration: 6000,
                description: '+10.000 CAMLY đã được cộng vào tài khoản'
              }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'followers',
          filter: `following_id=eq.${user.id}`
        },
        (payload) => {
          const newData = payload.new as any;
          
          // When someone sends us a friend request
          if (newData.status === 'pending') {
            toast.info(
              '👋 Bạn có yêu cầu kết bạn mới!',
              { 
                duration: 5000,
                description: 'Kiểm tra trong phần thông báo hoặc trang cá nhân'
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(violationsChannel);
      supabase.removeChannel(bonusChannel);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(friendshipChannel);
    };
  }, [user?.id]);
};
