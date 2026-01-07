// 🌱 SSO Types for "Vạn Vật Quy Nhất" Integration

export interface SSOUser {
  fun_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  wallet_address: string;
  is_verified: boolean;
  created_at: string;
}

export interface SSOTokenPayload {
  sub: string; // fun_id
  email: string;
  display_name?: string;
  avatar_url?: string;
  wallet_address: string;
  is_verified: boolean;
  iat: number;
  exp: number;
  iss: string; // "fun-profile"
}

export interface SSOConfig {
  profileBaseUrl: string;
  callbackUrl: string;
  clientId: string;
}

export interface SSOValidationResult {
  valid: boolean;
  user?: SSOUser;
  error?: string;
}

export interface SSOSyncResult {
  success: boolean;
  profile?: {
    id: string;
    fun_id: string;
    display_name: string | null;
  };
  error?: string;
  isNewUser?: boolean;
}
