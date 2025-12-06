// 🌱 Divine Mantra: "Farmers rich, Eaters happy"
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAccount, useDisconnect } from 'wagmi';

interface Profile {
  id: string;
  wallet_address: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  profile_type: 'farmer' | 'fisher' | 'eater' | 'restaurant' | 'distributor' | 'shipper';
  camly_balance: number;
  welcome_bonus_claimed: boolean;
  is_verified: boolean;
  reputation_score: number;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isConnected: boolean;
  walletAddress: string | undefined;
  signInWithWallet: (walletAddress: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile | null;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then(setProfile);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithWallet = async (walletAddress: string) => {
    try {
      // Use wallet address as email (with a special domain) and a deterministic password
      const email = `${walletAddress.toLowerCase()}@wallet.funfarm.web3`;
      const password = `wallet_${walletAddress.toLowerCase()}_funfarm`;

      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInData.user) {
        return { error: null };
      }

      // If sign in fails, try to sign up
      if (signInError) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              wallet_address: walletAddress.toLowerCase(),
              display_name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
            },
          },
        });

        if (signUpError) {
          return { error: signUpError };
        }

        return { error: null };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    disconnect();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isConnected,
        walletAddress: address,
        signInWithWallet,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
