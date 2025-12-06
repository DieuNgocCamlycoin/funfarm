// 🌱 Divine Mantra: "Farm to Table, Fair & Fast"
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Loader2, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const ConnectWallet = () => {
  const { connectors, connect, isPending, error } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signInWithWallet, user, profile } = useAuth();
  const navigate = useNavigate();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // When wallet connects, authenticate with Supabase
  useEffect(() => {
    const authenticateWallet = async () => {
      if (isConnected && address && !user && !isAuthenticating) {
        setIsAuthenticating(true);
        const { error } = await signInWithWallet(address);
        
        if (error) {
          toast.error('Authentication failed: ' + error.message);
        } else {
          toast.success('Welcome to FUN FARM Web3! 🌱');
        }
        setIsAuthenticating(false);
      }
    };

    authenticateWallet();
  }, [isConnected, address, user, signInWithWallet, isAuthenticating]);

  // Redirect to profile setup if authenticated but no profile type selected
  useEffect(() => {
    if (user && profile && !profile.welcome_bonus_claimed) {
      navigate('/profile-setup');
    }
  }, [user, profile, navigate]);

  if (isConnected && address) {
    return (
      <Card className="w-full max-w-md mx-auto border-primary/20 shadow-glow">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-hero flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">Wallet Connected!</CardTitle>
          <CardDescription className="font-mono text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAuthenticating ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </div>
          ) : user ? (
            <div className="text-center">
              <p className="text-primary font-medium mb-4">✨ You're all set!</p>
              <Button 
                variant="outline" 
                onClick={() => disconnect()}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
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
        <CardTitle className="text-2xl font-display">Connect Your Wallet</CardTitle>
        <CardDescription>
          Join FUN FARM Web3 and receive <span className="text-accent font-bold">50,000 CAMLY</span> welcome bonus! 🎉
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
