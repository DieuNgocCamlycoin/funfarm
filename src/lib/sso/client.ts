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
  storage: new SessionStorageAdapter('fun_farm_sso'),
});

// Re-export useful SDK types and classes
export { 
  TokenExpiredError, 
  RateLimitError, 
  NetworkError 
} from '@fun-ecosystem/sso-sdk';
