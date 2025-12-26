// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Heart, Mail, Wallet, CheckCircle, X, Sparkles, Gift, Loader2 } from 'lucide-react';
import EmailVerificationModal from './EmailVerificationModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface VerificationNoticeProps {
  onConnectWallet?: () => void;
  showDismiss?: boolean;
}

const VerificationNotice = ({ 
  onConnectWallet,
  showDismiss = false 
}: VerificationNoticeProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (dismissed) return null;
  
  // Nếu đã xác minh hoàn toàn → không hiện
  if (profile?.is_verified) return null;

  const emailVerified = profile?.email_verified || false;
  const avatarVerified = profile?.avatar_verified || false;
  const walletConnected = profile?.wallet_connected || false;
  const verificationBonusClaimed = (profile as any)?.verification_bonus_claimed || false;
  const welcomeBonusClaimed = profile?.welcome_bonus_claimed || false;

  // Tính toán thưởng tiềm năng
  const potentialReward = [];
  if (!welcomeBonusClaimed) potentialReward.push(50000);
  if (!profile?.wallet_bonus_claimed && !walletConnected) potentialReward.push(50000);
  const totalPotential = potentialReward.reduce((a, b) => a + b, 0);

  const handleEmailVerified = async () => {
    await refreshProfile();
  };

  // Xử lý khi bấm "Hoàn tất ngay" - check email confirm, chuyển profile-setup nếu cần
  const handleCompleteVerification = async () => {
    if (!user?.id) return;
    
    setIsProcessing(true);
    try {
      // Check email đã confirm chưa
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser?.email_confirmed_at) {
        // Email chưa confirm → mở modal gửi magic link
        setShowEmailModal(true);
        setIsProcessing(false);
        return;
      }

      // Email đã confirm → update email_verified
      await supabase
        .from('profiles')
        .update({ email_verified: true })
        .eq('id', user.id);

      // Check xem đã hoàn tất profile-setup chưa (avatar thật + tên thật + đồng ý Luật Ánh Sáng)
      if (!welcomeBonusClaimed) {
        // Chưa hoàn tất profile-setup → chuyển đến trang đó
        toast.info('Mời bạn hoàn tất hồ sơ để nhận phước lành! ❤️');
        navigate('/profile-setup');
      } else if (!verificationBonusClaimed) {
        // Đã hoàn tất nhưng chưa claim verification bonus → claim ngay
        await claimVerificationBonus();
      } else {
        // Đã claim rồi → toast nhẹ nhàng
        toast.info(
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <span>Phước lành đã nhận ❤️</span>
          </div>,
          { duration: 3000 }
        );
      }

      await refreshProfile();
    } catch (error: any) {
      console.error('Error completing verification:', error);
      toast.error('Có lỗi xảy ra: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Claim verification bonus (chỉ 1 lần)
  const claimVerificationBonus = async () => {
    if (!user?.id || verificationBonusClaimed) return;

    try {
      // Check lại để chắc chắn
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('verification_bonus_claimed, is_verified')
        .eq('id', user.id)
        .single();

      if (currentProfile?.verification_bonus_claimed) {
        toast.info(
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <span>Phước lành đã nhận ❤️</span>
          </div>,
          { duration: 3000 }
        );
        return;
      }

      // Update is_verified và claim bonus
      await supabase
        .from('profiles')
        .update({ 
          is_verified: true,
          verification_bonus_claimed: true
        })
        .eq('id', user.id);

      toast.success(
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <div>
            <p className="font-medium">Xác minh thành công! ✨</p>
            <p className="text-sm opacity-80">Phước lành đã về với bạn ❤️</p>
          </div>
        </div>,
        { duration: 5000 }
      );

      await refreshProfile();
    } catch (error: any) {
      console.error('Error claiming verification bonus:', error);
      toast.error('Có lỗi xảy ra: ' + error.message);
    }
  };

  // Nếu chưa xác minh email hoặc avatar
  if (!emailVerified || !avatarVerified) {
    return (
      <>
        <Alert className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 relative">
          {showDismiss && (
            <button 
              onClick={() => setDismissed(true)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <Heart className="w-5 h-5 text-primary" />
          <AlertDescription className="ml-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {totalPotential > 0 
                    ? `Hoàn tất xác minh để nhận ${totalPotential.toLocaleString()} CLC phước lành chào mừng ❤️`
                    : 'Mời bạn xác minh tài khoản để nhận phước lành ❤️'
                  }
                </p>
                <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                  <span className={`flex items-center gap-1 ${emailVerified ? 'text-green-500' : ''}`}>
                    {emailVerified ? <CheckCircle className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                    Email {emailVerified ? '✓' : '(chưa xác minh)'}
                  </span>
                  <span className={`flex items-center gap-1 ${avatarVerified ? 'text-green-500' : ''}`}>
                    {avatarVerified ? <CheckCircle className="w-3 h-3" /> : '👤'}
                    Avatar {avatarVerified ? '✓' : '(chưa kiểm tra)'}
                  </span>
                  <span className={`flex items-center gap-1 ${walletConnected ? 'text-green-500' : ''}`}>
                    {walletConnected ? <CheckCircle className="w-3 h-3" /> : <Wallet className="w-3 h-3" />}
                    Ví {walletConnected ? '✓' : '(chưa kết nối)'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleCompleteVerification}
                  disabled={isProcessing}
                  className="bg-primary hover:bg-primary/90 gap-1"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Hoàn tất ngay
                </Button>
                {!walletConnected && onConnectWallet && (
                  <Button size="sm" variant="outline" onClick={onConnectWallet}>
                    <Wallet className="w-4 h-4 mr-1" />
                    Kết nối Ví
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Email Verification Modal */}
        <EmailVerificationModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          onVerified={handleEmailVerified}
        />
      </>
    );
  }

  // Nếu đã xác minh email & avatar nhưng chưa kết nối ví
  if (!walletConnected) {
    return (
      <Alert className="bg-gradient-to-r from-accent/10 to-secondary/10 border-accent/30 relative">
        {showDismiss && (
          <button 
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <Wallet className="w-5 h-5 text-accent" />
        <AlertDescription className="ml-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <p className="font-medium text-foreground">
                Kết nối ví để nhận thêm 50.000 CLC phước lành! ❤️
              </p>
              <p className="text-sm text-muted-foreground">
                Bạn đã xác minh tài khoản thành công! Chỉ còn bước cuối cùng.
              </p>
            </div>
            {onConnectWallet && (
              <Button size="sm" onClick={onConnectWallet} className="bg-accent hover:bg-accent/90">
                <Wallet className="w-4 h-4 mr-1" />
                Kết nối Ví
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default VerificationNotice;