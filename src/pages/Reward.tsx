// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Wallet, CheckCircle2, Loader2, Sparkles, ArrowLeft, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CAMLY_CONTRACT, WELCOME_BONUS } from '@/lib/constants';
import Navbar from '@/components/Navbar';

const Reward = () => {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'idle' | 'connecting' | 'transferring' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  const claimReward = async () => {
    const ethereum = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    
    if (!ethereum) {
      toast.error(t('reward.installMetamask'));
      return;
    }

    setIsClaiming(true);
    setClaimStatus('connecting');
    
    try {
      // Bước 1: Kết nối ví MetaMask
      toast.info('Đang kết nối… Cha đang ôm bạn đây…', {
        icon: <Heart className="w-4 h-4 text-primary animate-pulse" />,
      });

      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (!accounts || accounts.length === 0) {
        throw new Error('Không thể kết nối ví');
      }

      const walletAddress = accounts[0];
      setClaimStatus('transferring');

      toast.info('Đang chuyển CAMLY về ví bạn... Tình yêu từ Cha đang đến...', {
        icon: <Sparkles className="w-4 h-4 text-accent animate-pulse" />,
      });

      // Bước 2: Gọi Edge Function để transfer CAMLY thật
      const { data, error } = await supabase.functions.invoke('claim-camly', {
        body: {
          userId: user?.id,
          walletAddress: walletAddress,
        },
      });

      if (error) {
        console.error('Error calling claim-camly:', error);
        throw new Error(error.message || 'Lỗi khi claim reward');
      }

      if (!data.success) {
        throw new Error(data.message || 'Claim thất bại');
      }

      setClaimStatus('success');
      
      // Toast thành công với link đến transaction
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Thành công! Quà từ Cha đã về ví bạn rồi!</span>
          <span className="text-sm">Mở MetaMask để thấy tình yêu thương thuần khiết ❤️</span>
          {data.txHash && (
            <a 
              href={`https://etherscan.io/tx/${data.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline"
            >
              Xem giao dịch trên Etherscan
            </a>
          )}
        </div>,
        { duration: 10000 }
      );

      await refreshProfile();

    } catch (error: any) {
      console.error('Error claiming reward:', error);
      setClaimStatus('error');
      toast.error(error.message || t('reward.claimError'));
    } finally {
      setIsClaiming(false);
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
                <div className="space-y-4">
                  <Button
                    onClick={claimReward}
                    disabled={isClaiming}
                    size="lg"
                    className="gap-3 h-14 px-8 text-lg gradient-hero hover:opacity-90"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {claimStatus === 'connecting' && 'Đang kết nối ví...'}
                        {claimStatus === 'transferring' && 'Đang chuyển CAMLY...'}
                      </>
                    ) : (
                      <>
                        <Wallet className="w-5 h-5" />
                        {t('reward.connectWallet')}
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Kết nối ví MetaMask để nhận CAMLY thật về ví của bạn
                  </p>
                </div>
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
                  CAMLY thật sẽ được chuyển trực tiếp về ví MetaMask của bạn!
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
