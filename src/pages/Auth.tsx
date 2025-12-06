// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ConnectWallet from '@/components/auth/ConnectWallet';
import { useAuth } from '@/hooks/useAuth';
import { Sprout, Waves, Sun } from 'lucide-react';

const Auth = () => {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isLoading && user && profile?.welcome_bonus_claimed) {
      navigate('/feed');
    }
  }, [user, profile, isLoading, navigate]);

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
