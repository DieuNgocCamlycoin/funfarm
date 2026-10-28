// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ConnectWallet from '@/components/auth/ConnectWallet';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { startSSOLogin } from '@/lib/sso';
import { Sprout, Waves, Sun } from 'lucide-react';

const Auth = () => {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [ssoError, setSsoError] = useState('');
  const [doorAttempt, setDoorAttempt] = useState(0);

  useEffect(() => {
    if (!isLoading && user && profile) {
      // CRITICAL: Only redirect if email is verified (OTP completed)
      // If email not verified, stay on auth page to complete OTP flow
      if (!profile.email_verified) {
        return; // Stay on auth page - ConnectWallet will handle OTP modal
      }

      const requestedPath = searchParams.get('returnTo');
      const returnTo = requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
        ? requestedPath
        : '/feed';

      if (!profile.welcome_bonus_claimed) {
        // Chưa hoàn tất profile → chuyển đến profile-setup
        navigate('/profile-setup');
      } else {
        // Đã hoàn tất → chuyển Feed
        navigate(returnTo, { replace: true });
      }
    }
  }, [user, profile, isLoading, navigate, searchParams]);

  // PILOT (đính chính 2026-10-28: KHÔNG nút bấm, KHÔNG màn hình chọn):
  // Chưa đăng nhập thì TỰ ĐỘNG chuyển thẳng sang cửa account.fun.rich bằng
  // startAuth/PKCE có sẵn trong src/lib/sso. Form native OTP bên dưới vẫn giữ
  // nguyên trong code, chỉ là trong pilot nó không còn là đường vào đăng nhập.
  // User đã có session native thì không bị chuyển (giữ logic cũ ở trên).
  useEffect(() => {
    if (isLoading || user) return;
    let cancelled = false;
    (async () => {
      try {
        const url = await startSSOLogin();
        if (!cancelled) {
          window.location.href = url;
        }
      } catch {
        if (!cancelled) {
          setSsoError('Không mở được cửa đăng nhập FUN. Vui lòng thử lại.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, user, doorAttempt]);

  // Chưa đăng nhập: chỉ hiện trạng thái chuyển hướng, không hiện form chọn.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          {ssoError ? (
            <>
              <p className="text-destructive mb-4">{ssoError}</p>
              <Button
                onClick={() => {
                  setSsoError('');
                  setDoorAttempt((c) => c + 1);
                }}
              >
                Thử lại / Retry
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">
              Đang chuyển tới cửa FUN... / Redirecting to the FUN door...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 gradient-glow opacity-50" />
      <div className="absolute top-20 left-10 animate-float">
        <Sprout className="w-12 h-12 text-primary/30" />
      </div>
      <div className="absolute top-40 right-20 animate-float-delayed">
        <Sun className="w-16 h-16 text-accent/30" />
      </div>
      <div className="absolute bottom-20 left-1/4 animate-float">
        <Waves className="w-14 h-14 text-secondary/30" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-4xl">🌱</span>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient-hero">
              {t('auth.title')}
            </h1>
            <span className="text-4xl">🌾</span>
          </div>
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            {t('common.slogan')}<br />
            <span className="text-primary font-medium">{t('common.subSlogan')}</span>
          </p>
        </div>

        {/* Wallet Connect Card */}
        <ConnectWallet />

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur border border-border">
            <div className="text-3xl mb-3">🔐</div>
            <h3 className="font-display font-semibold mb-2">{t('auth.web3Login')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('auth.web3LoginDesc')}
            </p>
          </div>
          <div className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur border border-border">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-display font-semibold mb-2">{t('auth.earnCamly')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('auth.earnCamlyDesc')}
            </p>
          </div>
          <div className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur border border-border">
            <div className="text-3xl mb-3">🌍</div>
            <h3 className="font-display font-semibold mb-2">{t('auth.zeroFees')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('auth.zeroFeesDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
