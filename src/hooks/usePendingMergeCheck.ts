import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PendingMergeStatus {
  isPending: boolean;
  status?: 'pending' | 'provisioned';
  requestId?: string;
  createdAt?: string;
  userEmail?: string;
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
          .select('merge_request_id, email')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking pending merge:', error);
          setStatus({ isPending: false, isLoading: false });
          return;
        }

        if (profile?.merge_request_id) {
          // Get status and created_at from merge_request_logs
          const { data: logData } = await supabase
            .from('merge_request_logs')
            .select('created_at, status')
            .eq('user_id', user.id)
            .in('status', ['pending', 'provisioned'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          setStatus({
            isPending: true,
            status: (logData?.status as 'pending' | 'provisioned') || 'pending',
            requestId: profile.merge_request_id,
            createdAt: logData?.created_at,
            userEmail: profile.email || undefined,
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
