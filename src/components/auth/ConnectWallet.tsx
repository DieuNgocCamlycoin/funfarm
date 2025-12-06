// 🌱 Divine Mantra: "Farm to Table, Fair & Fast"
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, LogOut, Eye, EyeOff, Mail, Lock, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WELCOME_BONUS } from '@/lib/constants';

const ConnectWallet = () => {
  const { signUp, signIn, user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { t } = useTranslation();

  // Redirect to profile setup if authenticated but no profile type selected
  useEffect(() => {
    if (user && profile && !profile.welcome_bonus_claimed) {
      navigate('/profile-setup');
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error(t('auth.fillAllFields'));
      return;
    }

    if (password.length < 6) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }

    setIsLoading(true);
    
    if (isLoginMode) {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error(t('auth.invalidCredentials'));
        } else {
          toast.error(t('auth.signInError') + ': ' + error.message);
        }
      } else {
        toast.success(t('auth.welcomeBack'));
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error(t('auth.emailAlreadyRegistered'));
        } else {
          toast.error(t('auth.signUpError') + ': ' + error.message);
        }
      } else {
        toast.success(t('auth.welcomeBonus', { bonus: WELCOME_BONUS.toLocaleString() }), {
          description: t('auth.welcomeBonusMessage'),
          duration: 5000,
        });
      }
    }
    
    setIsLoading(false);
  };

  const handleExploreAsGuest = () => {
    navigate('/');
  };

  if (user) {
    return (
      <Card className="w-full max-w-md mx-auto border-primary/20 shadow-glow">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-hero flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">{t('auth.signedIn')}</CardTitle>
          <CardDescription className="text-sm">
            {user.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-primary font-medium mb-4">✨ {t('auth.allSet')}</p>
            <Button 
              variant="outline" 
              onClick={() => signOut()}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              {t('common.disconnect')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto border-border shadow-card">
      <CardHeader className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          {isLoginMode ? (
            <Mail className="w-8 h-8 text-primary" />
          ) : (
            <Gift className="w-8 h-8 text-primary" />
          )}
        </div>
        <CardTitle className="text-2xl font-display">
          {isLoginMode ? t('auth.signIn') : t('auth.signUpTitle')}
        </CardTitle>
        <CardDescription>
          {isLoginMode 
            ? t('auth.signInDesc') 
            : t('auth.welcomeBonusDesc', { bonus: WELCOME_BONUS.toLocaleString() })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              {t('auth.emailLabel')}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              {t('auth.passwordLabel')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full gap-3 h-14 text-base gradient-hero hover:opacity-90"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLoginMode ? (
              <Mail className="w-5 h-5" />
            ) : (
              <Gift className="w-5 h-5" />
            )}
            {isLoginMode ? t('auth.signInButton') : t('auth.signUpButton', { bonus: WELCOME_BONUS.toLocaleString() })}
          </Button>
        </form>

        {/* Toggle Login/Register */}
        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            {isLoginMode ? t('auth.noAccount') : t('auth.hasAccount')}
          </span>{' '}
          <button
            type="button"
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="text-primary font-medium hover:underline"
          >
            {isLoginMode ? t('auth.signUpHere') : t('auth.signInHere')}
          </button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t('auth.or')}</span>
          </div>
        </div>

        {/* Explore as Guest Button */}
        <Button
          onClick={handleExploreAsGuest}
          variant="outline"
          className="w-full gap-3 h-12"
        >
          <Eye className="w-5 h-5" />
          {t('auth.exploreAsGuest')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConnectWallet;
