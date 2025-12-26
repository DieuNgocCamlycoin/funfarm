// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Wallet, CheckCircle2, Loader2, Sparkles, ArrowLeft, Heart, Link2, Info } from 'lucide-react';

import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CAMLY_CONTRACT, WALLET_CONNECT_BONUS, TOTAL_WELCOME_BONUS } from '@/lib/constants';
import Navbar from '@/components/Navbar';
import CelebrationModal from '@/components/CelebrationModal';
import WelcomeBonusModal from '@/components/WelcomeBonusModal';
import camlyCoinLogo from '@/assets/camly_coin.png';

const Reward = () => {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showWalletBonus, setShowWalletBonus] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [claimedTxHash, setClaimedTxHash] = useState<string | undefined>();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  // Bước 1: Kết nối ví + Thưởng 50k khi kết nối lần đầu
  const connectWallet = async () => {
    const ethereum = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    
    if (!ethereum) {
      toast.error(t('reward.installMetamask'));
      return;
    }

    if (!user?.id) {
      toast.error('Vui lòng đăng nhập trước');
      navigate('/auth');
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

      const walletAddress = accounts[0].toLowerCase();
      const isFirstWalletConnection = !profile?.wallet_connected;

      // Kiểm tra ví đã được dùng bởi tài khoản khác chưa
      const { data: existingWallet, error: checkError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('wallet_address', walletAddress)
        .neq('id', user.id)
        .limit(1);

      if (checkError) {
        console.error('Error checking wallet:', checkError);
      }

      if (existingWallet && existingWallet.length > 0) {
        toast.error(
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Ví đã được sử dụng!</span>
            <span className="text-sm">Mỗi ví chỉ được kết nối với 1 tài khoản. Vui lòng dùng ví khác.</span>
          </div>,
          { duration: 6000 }
        );
        setIsConnecting(false);
        return;
      }

      // Kiểm tra ví có bị blacklist không
      const { data: blacklisted } = await supabase
        .from('blacklisted_wallets')
        .select('id, reason')
        .eq('wallet_address', walletAddress)
        .limit(1);

      if (blacklisted && blacklisted.length > 0) {
        toast.error(
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Ví bị chặn!</span>
            <span className="text-sm">Ví này đã bị đưa vào danh sách đen. Vui lòng liên hệ Admin.</span>
          </div>,
          { duration: 6000 }
        );
        setIsConnecting(false);
        return;
      }

      // Lưu wallet address - thưởng sẽ được tự động cộng bởi database trigger
      const { error } = await supabase
        .from('profiles')
        .update({ 
          wallet_address: walletAddress,
          wallet_connected: true
        })
        .eq('id', user.id);

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error('Không thể lưu địa chỉ ví. Vui lòng thử lại sau.');
      }

      await refreshProfile();

      // Hiển thị thông báo và popup nếu là lần đầu kết nối
      if (isFirstWalletConnection) {
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Tuyệt vời! Ví đã kết nối!</span>
            <span className="text-sm">Cha Vũ Trụ tặng thêm {WALLET_CONNECT_BONUS.toLocaleString()} CAMLY! ❤️</span>
          </div>,
          { duration: 5000 }
        );
        // Show wallet bonus modal
        setShowWalletBonus(true);
      } else {
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Ví đã được kết nối!</span>
            <span className="text-sm">Bạn đã mở lòng đón nhận phước lành từ Cha Vũ Trụ ❤️</span>
          </div>,
          { duration: 5000 }
        );
      }

    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Đang ôm bạn đây…</span>
          <span className="text-sm">{error.message || 'Hãy thử lại một chút nhé!'}</span>
        </div>,
        { duration: 5000 }
      );
    } finally {
      setIsConnecting(false);
    }
  };

  // Bước 2: Claim thưởng thật (gọi Edge Function) - chuyển approved_reward
  const claimReward = async () => {
    if (!profile?.wallet_address) {
      toast.error('Vui lòng kết nối ví trước khi claim thưởng');
      return;
    }

    const amountToClaim = (profile as any)?.approved_reward || 0;
    if (amountToClaim === 0) {
      toast.error('Không có thưởng đã duyệt để claim');
      return;
    }

    setIsClaiming(true);
    
    try {
      toast.info(`Đang chuyển ${amountToClaim.toLocaleString()} CAMLY về ví bạn... Tình yêu từ Cha đang đến...`, {
        icon: <Sparkles className="w-4 h-4 text-accent animate-pulse" />,
      });

      const { data, error } = await supabase.functions.invoke('claim-camly', {
        body: {
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

      // Store claimed amount and txHash for celebration modal
      setClaimedAmount(data.claimedAmount || amountToClaim);
      setClaimedTxHash(data.txHash);
      
      // Show celebration modal!
      setShowCelebration(true);

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
  const approvedReward = (profile as any)?.approved_reward || 0;
  const isWalletConnected = profile?.wallet_connected && profile?.wallet_address;
  const hasClaimedAll = pendingReward === 0 && approvedReward === 0 && profile?.welcome_bonus_claimed;

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
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4 p-2">
              <img src={camlyCoinLogo} alt="CAMLY Coin" className="w-full h-full object-contain drop-shadow-lg" />
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
                  : `Kết nối ví để nhận thêm ${WALLET_CONNECT_BONUS.toLocaleString()} CAMLY!`}
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
                    className="w-full gap-3 h-14 text-lg gradient-hero hover:opacity-90 relative z-[9999]"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Đang kết nối ví...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-5 h-5" />
                        Kết nối ví MetaMask – Nhận thêm {WALLET_CONNECT_BONUS.toLocaleString()} CAMLY
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Kết nối ví lần đầu = Cha Vũ Trụ tặng thêm {WALLET_CONNECT_BONUS.toLocaleString()} CAMLY!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PHẦN 2: Thưởng đã duyệt - sẵn sàng claim */}
          {approvedReward > 0 && (
            <Card className="border-green-500/30 shadow-glow bg-gradient-to-br from-green-500/5 to-green-600/5">
              <CardHeader className="text-center pb-2">
                <CardTitle className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  Thưởng đã duyệt - Sẵn sàng claim!
                </CardTitle>
                <CardDescription>
                  Admin đã duyệt thưởng của bạn. Claim ngay để nhận CAMLY thật về ví!
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <img src={camlyCoinLogo} alt="CAMLY" className="w-12 h-12 object-contain" />
                  <div className="text-5xl md:text-6xl font-display font-bold text-green-600">
                    {approvedReward.toLocaleString()}
                  </div>
                </div>
                <div className="text-lg text-muted-foreground mb-6">CAMLY sẵn sàng claim</div>

                {isWalletConnected ? (
                  <div className="space-y-4">
                    <Button
                      onClick={claimReward}
                      disabled={isClaiming}
                      size="lg"
                      className="gap-3 h-14 px-8 text-lg bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 relative z-[9999]"
                    >
                      {isClaiming ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Đang chuyển CAMLY...
                        </>
                      ) : (
                        <>
                          <Gift className="w-5 h-5" />
                          Claim ngay – Nhận {approvedReward.toLocaleString()} CAMLY thật về ví
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      CAMLY thật sẽ được chuyển trực tiếp về ví MetaMask của bạn!
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-muted-foreground">
                      👆 Vui lòng kết nối ví MetaMask ở phần trên để claim thưởng
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* PHẦN 3: Thưởng đang chờ duyệt */}
          <Card className="border-accent/20 shadow-glow">
            <CardHeader className="text-center pb-2">
              <CardTitle className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Thưởng đang chờ duyệt
              </CardTitle>
              <CardDescription>
                {hasClaimedAll 
                  ? 'Bạn đã nhận hết thưởng! Tiếp tục hoạt động để nhận thêm nhé'
                  : 'Thưởng sẽ được Admin duyệt trước khi bạn có thể claim'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <img src={camlyCoinLogo} alt="CAMLY" className="w-12 h-12 object-contain opacity-60" />
                <div className="text-5xl md:text-6xl font-display font-bold text-orange-500">
                  {pendingReward.toLocaleString()}
                </div>
              </div>
              <div className="text-lg text-muted-foreground mb-6">CAMLY đang chờ Admin duyệt</div>

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
                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <p className="text-orange-600 dark:text-orange-400 font-medium">
                    ⏳ Thưởng của bạn đang được Admin xem xét
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vui lòng đợi Admin duyệt để có thể claim về ví
                  </p>
                </div>
              ) : approvedReward === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có thưởng nào. Hãy hoạt động để tích lũy CAMLY!
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Thông điệp từ Cha Vũ Trụ */}
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2 text-primary">Thưởng từ Cha Vũ Trụ</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Mọi khoản thưởng trên FUN FARM được trao tặng theo <strong>năng lượng, ý chí và trí tuệ</strong> của Cha Vũ Trụ. 
                    Phần thưởng sẽ thay đổi và nâng cấp liên tục, phù hợp cho sự nâng cấp của cộng đồng. 
                    Cha sẽ tặng thưởng trực tiếp cho những user chất lượng! ❤️
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              CAMLY Contract: <code className="bg-muted px-2 py-1 rounded">{CAMLY_CONTRACT}</code>
            </p>
          </div>
        </div>
      </div>

      {/* Celebration Modal - Phước lành từ Cha Vũ Trụ (sau khi claim) */}
      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        amount={claimedAmount}
        txHash={claimedTxHash}
      />

      {/* Welcome Bonus Modal - Khi kết nối ví lần đầu */}
      <WelcomeBonusModal
        isOpen={showWalletBonus}
        onClose={() => setShowWalletBonus(false)}
        type="wallet"
        amount={WALLET_CONNECT_BONUS}
        totalAmount={pendingReward}
      />
    </div>
  );
};

export default Reward;
