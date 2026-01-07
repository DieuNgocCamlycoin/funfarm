// 🌱 SSO Module for "Vạn Vật Quy Nhất" Integration
// Connects Fun Farm to Fun Profile central identity system

import { supabase } from '@/integrations/supabase/client';
import { funProfile } from './client';
import type { SSOUser, SSOSyncResult, FarmStats } from './types';

/**
 * Start SSO login flow - redirects to Fun Profile OAuth
 * Uses OAuth 2.0 + PKCE for security
 */
export const startSSOLogin = async (): Promise<string> => {
  return await funProfile.startAuth();
};

/**
 * Handle OAuth callback - exchange code for tokens
 */
export const handleSSOCallback = async (code: string, state: string) => {
  return await funProfile.handleCallback(code, state);
};

/**
 * Get current SSO user info
 */
export const getSSOUser = async () => {
  return await funProfile.getUser();
};

/**
 * Logout from SSO
 */
export const logoutSSO = async () => {
  await funProfile.logout();
};

/**
 * Sync Farm stats to Master (debounced)
 */
export const syncFarmDataToMaster = async (data: FarmStats) => {
  const syncManager = funProfile.getSyncManager(3000); // 3s debounce
  syncManager.queue('farm_stats', data as unknown as Record<string, unknown>);
};

/**
 * Flush pending sync data (call before page unload)
 */
export const flushSyncData = () => {
  const syncManager = funProfile.getSyncManager(3000);
  syncManager.flush();
};

/**
 * Sync profile from SSO to local Fun Farm database
 * Creates new profile if not exists, updates if exists
 */
export const syncProfileFromSSO = async (ssoUser: SSOUser): Promise<SSOSyncResult> => {
  try {
    // Check if profile with fun_id already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, fun_id, display_name')
      .eq('fun_id', ssoUser.fun_id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing profile:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (existingProfile) {
      // Update existing profile with latest SSO data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: ssoUser.display_name,
          avatar_url: ssoUser.avatar_url,
          wallet_address: ssoUser.wallet_address,
          is_verified: ssoUser.is_verified,
          synced_from_profile: true,
          last_synced_at: new Date().toISOString(),
        })
        .eq('fun_id', ssoUser.fun_id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return { success: false, error: updateError.message };
      }

      return {
        success: true,
        profile: existingProfile,
        isNewUser: false,
      };
    }

    // Profile doesn't exist - will be created after Supabase Auth signup
    // Return info for the auth flow to handle
    return {
      success: true,
      profile: {
        id: '', // Will be set after auth
        fun_id: ssoUser.fun_id,
        display_name: ssoUser.display_name,
      },
      isNewUser: true,
    };
  } catch (error) {
    console.error('SSO sync error:', error);
    return { success: false, error: 'Sync failed' };
  }
};

/**
 * Link existing local account to Fun-ID
 * Called when user connects Fun-ID to existing account
 */
export const linkFunIdToProfile = async (
  userId: string, 
  funId: string, 
  funProfileId?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        fun_id: funId,
        fun_profile_id: funProfileId || null,
        synced_from_profile: true,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return !error;
  } catch (error) {
    console.error('Error linking Fun-ID:', error);
    return false;
  }
};

// Re-export client and types
export { funProfile } from './client';
export { TokenExpiredError, RateLimitError, NetworkError } from './client';
export type { SSOUser, SSOValidationResult, SSOSyncResult, SSOConfig, FarmStats } from './types';
