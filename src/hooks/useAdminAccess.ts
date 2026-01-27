// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AdminAccess {
  isAdmin: boolean;
  isOwner: boolean;
  canAccessAdmin: boolean;
  isLoading: boolean;
}

/**
 * Hook to check admin/owner roles efficiently
 * Uses single Promise.all call to avoid duplicate RPC calls
 */
export function useAdminAccess(): AdminAccess {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkRoles = async () => {
      if (authLoading) return;
      
      if (!user?.id) {
        setIsAdmin(false);
        setIsOwner(false);
        setIsLoading(false);
        return;
      }

      try {
        // Single Promise.all call - efficient!
        const [adminResult, ownerResult] = await Promise.all([
          supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
          supabase.rpc('has_role', { _user_id: user.id, _role: 'owner' })
        ]);

        const adminAccess = adminResult.data === true;
        const ownerAccess = ownerResult.data === true;

        setIsAdmin(adminAccess || ownerAccess); // Owner implicitly has admin access
        setIsOwner(ownerAccess);
      } catch (error) {
        console.error('Error checking admin roles:', error);
        setIsAdmin(false);
        setIsOwner(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkRoles();
  }, [user?.id, authLoading]);

  return {
    isAdmin,
    isOwner,
    canAccessAdmin: isAdmin || isOwner,
    isLoading: isLoading || authLoading
  };
}
