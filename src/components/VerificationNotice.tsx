// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Heart, Mail, Wallet, CheckCircle, X } from 'lucide-react';

interface VerificationNoticeProps {
  onVerifyEmail?: () => void;
  onConnectWallet?: () => void;
  showDismiss?: boolean;
}

const VerificationNotice = ({ 
  onVerifyEmail, 
  onConnectWallet,
  showDismiss = false 
}: VerificationNoticeProps) => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  
  // Nếu đã xác minh hoàn toàn → không hiện
  if (profile?.is_verified) return null;

  const emailVerified = profile?.email_verified || false;
  const avatarVerified = profile?.avatar_verified || false;
  const walletConnected = profile?.wallet_connected || false;

  // Tính toán thưởng tiềm năng
  const potentialReward = [];
  if (!profile?.welcome_bonus_claimed) potentialReward.push(50000);
  if (!profile?.wallet_bonus_claimed && !walletConnected) potentialReward.push(50000);
  const totalPotential = potentialReward.reduce((a, b) => a + b, 0);

  // Nếu chưa xác minh email hoặc avatar
  if (!emailVerified || !avatarVerified) {
    return (
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
              {!emailVerified && onVerifyEmail && (
                <Button size="sm" onClick={onVerifyEmail} className="bg-primary hover:bg-primary/90">
                  <Mail className="w-4 h-4 mr-1" />
                  Xác minh Email
                </Button>
              )}
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
