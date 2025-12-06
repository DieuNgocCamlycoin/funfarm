// 🌱 Divine Mantra: "Farm to Table, Fair & Fast"
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Loader2, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WELCOME_BONUS } from '@/lib/wagmi';

const ConnectWallet = () => {
  const { connectors, connect, isPending, error } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signInWithWallet, signInWithGoogle, user, profile } = useAuth();
  const navigate = useNavigate();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { t } = useTranslation();

  // When wallet connects, authenticate with Supabase
  useEffect(() => {
    const authenticateWallet = async () => {
      if (isConnected && address && !user && !isAuthenticating) {
        setIsAuthenticating(true);
        const { error } = await signInWithWallet(address);
        
        if (error) {
          toast.error(t('auth.authFailed') + ': ' + error.message);
        } else {
          toast.success(t('auth.welcomeMessage'));
        }
        setIsAuthenticating(false);
      }
    };

    authenticateWallet();
  }, [isConnected, address, user, signInWithWallet, isAuthenticating, t]);

  // Redirect to profile setup if authenticated but no profile type selected
  useEffect(() => {
    if (user && profile && !profile.welcome_bonus_claimed) {
      navigate('/profile-setup');
    }
  }, [user, profile, navigate]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(t('auth.googleSignInError') + ': ' + error.message);
    }
    setIsGoogleLoading(false);
  };

  if (isConnected && address) {
    return (
      <Card className="w-full max-w-md mx-auto border-primary/20 shadow-glow">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-hero flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">{t('auth.walletConnected')}</CardTitle>
          <CardDescription className="font-mono text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAuthenticating ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('auth.authenticating')}</span>
            </div>
          ) : user ? (
            <div className="text-center">
              <p className="text-primary font-medium mb-4">✨ {t('auth.allSet')}</p>
              <Button 
                variant="outline" 
                onClick={() => disconnect()}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t('common.disconnect')}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto border-border shadow-card">
      <CardHeader className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Wallet className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-display">{t('auth.connectYourWallet')}</CardTitle>
        <CardDescription>
          {t('auth.welcomeBonusDesc', { bonus: WELCOME_BONUS.toLocaleString() })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Google Sign In Button */}
        <Button
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="w-full gap-3 h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
          variant="outline"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          {t('auth.signInWithGoogle')}
        </Button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              {t('auth.orContinueWith')}
            </span>
          </div>
        </div>

        {/* Wallet Connectors */}
        {connectors.map((connector) => (
          <Button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="w-full gap-2 h-12"
            variant={connector.name === 'MetaMask' ? 'default' : 'outline'}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wallet className="w-4 h-4" />
            )}
            {connector.name}
          </Button>
        ))}
        
        {error && (
          <p className="text-destructive text-sm text-center mt-2">
            {error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectWallet;
