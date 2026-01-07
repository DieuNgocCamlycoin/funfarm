// 🌱 SSO Module for "Vạn Vật Quy Nhất" Integration
// Connects Fun Farm to Fun Profile central identity system

import { supabase } from '@/integrations/supabase/client';
import type { SSOUser, SSOValidationResult, SSOSyncResult, SSOConfig } from './types';

// SSO Configuration - will be updated when SDK is received
const SSO_CONFIG: SSOConfig = {
  profileBaseUrl: 'https://profile.fun.rich', // Fun Profile base URL
  callbackUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/sso/callback`,
  clientId: 'fun-farm', // Platform identifier
};

/**
 * Get the SSO login URL to redirect users to Fun Profile
 */
export const getSSOLoginUrl = (): string => {
  const params = new URLSearchParams({
    client_id: SSO_CONFIG.clientId,
    redirect_uri: SSO_CONFIG.callbackUrl,
    response_type: 'token',
    scope: 'profile wallet',
  });
  
  return `${SSO_CONFIG.profileBaseUrl}/auth/sso?${params.toString()}`;
};

/**
 * Validate SSO token received from Fun Profile
 * In production, this will verify JWT signature with Fun Profile's public key
 */
export const validateSSOToken = async (token: string): Promise<SSOValidationResult> => {
  try {
    // TODO: When SDK arrives, implement proper JWT verification
    // For now, decode the token (unsafe - for development only)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { valid: false, error: 'Token expired' };
    }

    // Check issuer
    if (payload.iss !== 'fun-profile') {
      return { valid: false, error: 'Invalid token issuer' };
    }

    const user: SSOUser = {
      fun_id: payload.sub,
      email: payload.email,
      display_name: payload.display_name || null,
      avatar_url: payload.avatar_url || null,
      wallet_address: payload.wallet_address,
      is_verified: payload.is_verified || false,
      created_at: new Date(payload.iat * 1000).toISOString(),
    };

    return { valid: true, user };
  } catch (error) {
    console.error('SSO token validation error:', error);
    return { valid: false, error: 'Token validation failed' };
  }
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
export const linkFunIdToProfile = async (userId: string, funId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        fun_id: funId,
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

export { SSO_CONFIG };
export type { SSOUser, SSOValidationResult, SSOSyncResult, SSOConfig } from './types';
