// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Wallet, CheckCircle2, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CAMLY_CONTRACT, WELCOME_BONUS } from '@/lib/constants';
import Navbar from '@/components/Navbar';

const Reward = () => {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  const connectWallet = async () => {
    const ethereum = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    
    if (!ethereum) {
      toast.error(t('reward.installMetamask'));
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        
        // Update profile with wallet address and mark as connected
        const { error } = await supabase
          .from('profiles')
          .update({ 
            wallet_address: address,
            wallet_connected: true,
            pending_reward: 0,
            camly_balance: (profile?.camly_balance || 0) + (profile?.pending_reward || WELCOME_BONUS)
          })
          .eq('id', user?.id);

        if (error) {
          toast.error(t('reward.claimError'));
          console.error('Error updating profile:', error);
        } else {
          toast.success(t('reward.claimSuccess', { amount: (profile?.pending_reward || WELCOME_BONUS).toLocaleString() }));
          await refreshProfile();
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error(t('reward.connectError'));
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingReward = profile?.pending_reward || 0;
  const hasClaimedReward = profile?.wallet_connected && pendingReward === 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('profile.back')}
        </Button>

        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
              <Gift className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-gradient-hero mb-2">
              {t('reward.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('reward.subtitle')}
            </p>
          </div>

          {/* Reward Card */}
          <Card className="border-primary/20 shadow-glow mb-6">
            <CardHeader className="text-center pb-2">
              <CardTitle className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                {t('reward.pendingReward')}
              </CardTitle>
              <CardDescription>
                {hasClaimedReward ? t('reward.alreadyClaimed') : t('reward.waitingClaim')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-5xl md:text-6xl font-display font-bold text-primary mb-2">
                {hasClaimedReward ? '0' : pendingReward.toLocaleString()}
              </div>
              <div className="text-lg text-muted-foreground mb-6">CAMLY</div>

              {hasClaimedReward ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-medium">{t('reward.claimed')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('reward.walletAddress')}: {profile?.wallet_address?.slice(0, 6)}...{profile?.wallet_address?.slice(-4)}
                  </p>
                </div>
              ) : (
                <Button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  size="lg"
                  className="gap-3 h-14 px-8 text-lg gradient-hero hover:opacity-90"
                >
                  {isConnecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Wallet className="w-5 h-5" />
                  )}
                  {t('reward.connectWallet')}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="text-2xl mb-2">🎁</div>
                <h3 className="font-semibold mb-1">{t('reward.welcomeGift')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('reward.welcomeGiftDesc', { amount: WELCOME_BONUS.toLocaleString() })}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="text-2xl mb-2">🔗</div>
                <h3 className="font-semibold mb-1">{t('reward.claimProcess')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('reward.claimProcessDesc')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contract Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              CAMLY Contract: <code className="bg-muted px-2 py-1 rounded">{CAMLY_CONTRACT}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reward;
