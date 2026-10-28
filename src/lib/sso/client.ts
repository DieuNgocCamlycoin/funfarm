// 🌱 SSO Client for "Vạn Vật Quy Nhất" Integration
// Uses official @fun-ecosystem/sso-sdk

import { 
  FunProfileClient, 
  SessionStorageAdapter 
} from '@fun-ecosystem/sso-sdk';

// Create SSO client instance with SessionStorage (secure - clears on tab close)
export const funProfile = new FunProfileClient({
  clientId: 'fun_farm_client',
  redirectUri: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
  scopes: ['profile', 'email', 'wallet', 'rewards'],
  // PILOT: tro issuer sang cua account.fun.rich.
  // SDK 1.0.0 cho phep tuy chinh baseUrl (xac nhan qua source SDK).
  // Neu khong dat bien nay, SDK mac dinh tro project Supabase cu
  // (bhtsnervqiwchluwuxki) va luong pilot se khong toi cua.
  // Bien nay do Tri/Dieu Ngoc nhap trong env cua deployment farm.fun.rich.
  baseUrl: import.meta.env.VITE_FUN_PROFILE_SSO_BASE_URL || undefined,
  // BAT BUOC theo sso-token (C3): khong co secret thi doi ma tra 401.
  // Gia tri do Tri/Dieu Ngoc nhap env, KHONG commit vao repo.
  clientSecret: import.meta.env.VITE_FUN_FARM_CLIENT_SECRET || undefined,
  storage: new SessionStorageAdapter('fun_farm_sso'),
});

// Re-export useful SDK types and classes
export { 
  TokenExpiredError, 
  RateLimitError, 
  NetworkError 
} from '@fun-ecosystem/sso-sdk';
