import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PendingMergeStatus {
  isPending: boolean;
  requestId?: string;
  createdAt?: string;
  isLoading: boolean;
}

export function usePendingMergeCheck(): PendingMergeStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<PendingMergeStatus>({
    isPending: false,
    isLoading: true,
  });

  useEffect(() => {
    if (!user) {
      setStatus({ isPending: false, isLoading: false });
      return;
    }

    const checkPendingMerge = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('merge_request_id')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking pending merge:', error);
          setStatus({ isPending: false, isLoading: false });
          return;
        }

        if (profile?.merge_request_id) {
          // Get created_at from merge_request_logs
          const { data: logData } = await supabase
            .from('merge_request_logs')
            .select('created_at')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          setStatus({
            isPending: true,
            requestId: profile.merge_request_id,
            createdAt: logData?.created_at,
            isLoading: false,
          });
        } else {
          setStatus({ isPending: false, isLoading: false });
        }
      } catch (error) {
        console.error('Error in usePendingMergeCheck:', error);
        setStatus({ isPending: false, isLoading: false });
      }
    };

    checkPendingMerge();

    // Subscribe to profile changes
    const channel = supabase
      .channel('pending-merge-check')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newProfile = payload.new as { merge_request_id?: string };
          if (!newProfile.merge_request_id) {
            setStatus({ isPending: false, isLoading: false });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return status;
}
