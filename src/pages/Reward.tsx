// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Wallet, CheckCircle2, Loader2, Sparkles, ArrowLeft, Heart, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CAMLY_CONTRACT, WELCOME_BONUS } from '@/lib/constants';
import Navbar from '@/components/Navbar';

const Reward = () => {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  // Bước 1: Chỉ kết nối ví (không claim)
  const connectWallet = async () => {
    const ethereum = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    
    if (!ethereum) {
      toast.error(t('reward.installMetamask'));
      return;
    }

    setIsConnecting(true);
    
    try {
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

      // Lưu wallet address vào profile (không claim)
      const { error } = await supabase
        .from('profiles')
        .update({ 
          wallet_address: walletAddress,
          wallet_connected: true 
        })
        .eq('id', user?.id);

      if (error) {
        throw new Error('Không thể lưu địa chỉ ví');
      }

      await refreshProfile();

      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Ví đã được kết nối!</span>
          <span className="text-sm">Bạn đã mở lòng đón nhận phước lành từ Cha ❤️</span>
        </div>,
        { duration: 5000 }
      );

    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast.error(error.message || 'Lỗi kết nối ví');
    } finally {
      setIsConnecting(false);
    }
  };

  // Bước 2: Claim thưởng thật (gọi Edge Function)
  const claimReward = async () => {
    if (!profile?.wallet_address) {
      toast.error('Vui lòng kết nối ví trước khi claim thưởng');
      return;
    }

    setIsClaiming(true);
    
    try {
      toast.info('Đang chuyển CAMLY về ví bạn... Tình yêu từ Cha đang đến...', {
        icon: <Sparkles className="w-4 h-4 text-accent animate-pulse" />,
      });

      const { data, error } = await supabase.functions.invoke('claim-camly', {
        body: {
          userId: user?.id,
          walletAddress: profile.wallet_address,
        },
      });

      if (error) {
        console.error('Error calling claim-camly:', error);
        throw new Error(error.message || 'Lỗi khi claim reward');
      }

      if (!data.success) {
        throw new Error(data.message || 'Claim thất bại');
      }

      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Thành công! Quà từ Cha đã về ví bạn rồi!</span>
          <span className="text-sm">Cha đang ôm bạn thật chặt ❤️</span>
          {data.txHash && (
            <a 
              href={`https://bscscan.com/tx/${data.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline"
            >
              Xem giao dịch trên BscScan
            </a>
          )}
        </div>,
        { duration: 10000 }
      );

      await refreshProfile();

    } catch (error: any) {
      console.error('Error claiming reward:', error);
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
  const isWalletConnected = profile?.wallet_connected && profile?.wallet_address;
  const hasClaimedAll = pendingReward === 0 && profile?.welcome_bonus_claimed;

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

        <div className="max-w-2xl mx-auto space-y-6">
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

          {/* PHẦN 1: Ví của bạn */}
          <Card className="border-primary/20 shadow-glow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Ví của bạn
              </CardTitle>
              <CardDescription>
                {isWalletConnected 
                  ? 'Ví MetaMask đã được kết nối thành công'
                  : 'Kết nối ví để nhận phước lành từ Cha Vũ Trụ'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isWalletConnected ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-green-600 dark:text-green-400">Ví đã kết nối</p>
                    <p className="text-sm text-muted-foreground font-mono truncate">
                      {profile?.wallet_address?.slice(0, 10)}...{profile?.wallet_address?.slice(-8)}
                    </p>
                  </div>
                  <Link2 className="w-5 h-5 text-green-500" />
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    size="lg"
                    className="w-full gap-3 h-14 text-lg gradient-hero hover:opacity-90"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Đang kết nối ví...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-5 h-5" />
                        Kết nối ví MetaMask ngay
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Kết nối ví chỉ là bước mở lòng – bạn sẽ claim thưởng ở bước tiếp theo
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PHẦN 2: Thưởng đang chờ bạn nhận */}
          <Card className="border-accent/20 shadow-glow">
            <CardHeader className="text-center pb-2">
              <CardTitle className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Thưởng đang chờ bạn nhận
              </CardTitle>
              <CardDescription>
                {hasClaimedAll 
                  ? 'Bạn đã nhận hết thưởng! Tiếp tục hoạt động để nhận thêm nhé'
                  : 'Thưởng sẽ cộng dồn khi bạn đăng sản phẩm, review, mời bạn bè...'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-5xl md:text-6xl font-display font-bold text-primary mb-2">
                {pendingReward.toLocaleString()}
              </div>
              <div className="text-lg text-muted-foreground mb-6">CAMLY đang chờ claim</div>

              {hasClaimedAll ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-medium">Đã nhận hết thưởng!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tiếp tục hoạt động để tích lũy thêm CAMLY nhé ❤️
                  </p>
                </div>
              ) : pendingReward > 0 ? (
                <div className="space-y-4">
                  {isWalletConnected ? (
                    <>
                      <Button
                        onClick={claimReward}
                        disabled={isClaiming}
                        size="lg"
                        className="gap-3 h-14 px-8 text-lg bg-gradient-to-r from-accent to-primary hover:opacity-90"
                      >
                        {isClaiming ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Đang chuyển CAMLY...
                          </>
                        ) : (
                          <>
                            <Gift className="w-5 h-5" />
                            Claim ngay – Nhận {pendingReward.toLocaleString()} CAMLY thật
                          </>
                        )}
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        CAMLY thật sẽ được chuyển trực tiếp về ví MetaMask của bạn!
                      </p>
                    </>
                  ) : (
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <p className="text-muted-foreground">
                        👆 Vui lòng kết nối ví MetaMask ở phần trên để claim thưởng
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chưa có thưởng nào. Hãy hoạt động để tích lũy CAMLY!
                </p>
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
                <h3 className="font-semibold mb-1">Cộng dồn tự động</h3>
                <p className="text-sm text-muted-foreground">
                  Thưởng sẽ tự động cộng dồn khi bạn hoạt động – claim bất cứ lúc nào!
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
