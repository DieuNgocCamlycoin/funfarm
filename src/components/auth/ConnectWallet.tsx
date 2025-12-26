// 🌱 Divine Mantra: "Farm to Table, Fair & Fast"
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, LogOut, Eye, EyeOff, Mail, Lock, Gift, ArrowLeft, KeyRound, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WELCOME_BONUS } from '@/lib/constants';

const ConnectWallet = () => {
  const { signUp, signIn, user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { t } = useTranslation();
  
  // Magic link confirmation states
  const [showEmailSentScreen, setShowEmailSentScreen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Redirect to profile setup if authenticated but no profile type selected
  useEffect(() => {
    if (user && profile && !profile.welcome_bonus_claimed) {
      navigate('/profile-setup');
    } else if (user && profile?.welcome_bonus_claimed) {
      navigate('/feed');
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
        } else if (error.message.includes('Email not confirmed')) {
          // User exists but email not verified - show email sent screen
          setPendingEmail(email);
          setShowEmailSentScreen(true);
          await handleResendConfirmation(email);
          toast.info('Email chưa xác minh. Kiểm tra hộp thư để bấm link xác nhận!');
        } else {
          toast.error(t('auth.signInError') + ': ' + error.message);
        }
      } else {
        toast.success(t('auth.welcomeBack'));
      }
    } else {
      // Sign up flow - register then show magic link confirmation screen
      const { error } = await signUp(email, password);
      if (error) {
        console.log('[SignUp Error]', error.message, error);
        
        // Check for existing user - multiple possible error messages
        if (
          error.message.includes('already registered') || 
          error.message.includes('User already registered') ||
          error.message.includes('already been registered')
        ) {
          toast.info(
            <div className="flex items-center gap-2">
              <span>💖</span>
              <div>
                <p className="font-medium">Email này đã được đăng ký ❤️</p>
                <p className="text-sm opacity-80">Vui lòng đăng nhập hoặc dùng email khác nhé!</p>
              </div>
            </div>,
            { duration: 5000 }
          );
          setIsLoginMode(true);
        } 
        // Rate limit from Supabase Auth
        else if (
          error.message.includes('rate limit') || 
          error.message.includes('security purposes') ||
          error.message.includes('For security purposes') ||
          error.message.includes('seconds')
        ) {
          // Extract wait time from error message if available
          const waitMatch = error.message.match(/(\d+)\s*second/i);
          const waitTime = waitMatch ? parseInt(waitMatch[1]) : 60;
          
          toast.warning(
            <div className="flex items-center gap-2">
              <span>🛡️</span>
              <div>
                <p className="font-medium">Hệ thống đang bảo vệ bạn ❤️</p>
                <p className="text-sm opacity-80">Đợi {waitTime} giây rồi thử lại nhé!</p>
              </div>
            </div>,
            { duration: 6000 }
          );
        }
        // Weak password
        else if (
          error.message.includes('password') && 
          (error.message.includes('weak') || error.message.includes('short') || error.message.includes('least'))
        ) {
          toast.error(
            <div className="flex items-center gap-2">
              <span>🔐</span>
              <div>
                <p className="font-medium">Mật khẩu cần mạnh hơn ❤️</p>
                <p className="text-sm opacity-80">Ít nhất 6 ký tự, bao gồm chữ và số</p>
              </div>
            </div>,
            { duration: 5000 }
          );
        }
        // Invalid email format
        else if (error.message.includes('email') && error.message.includes('invalid')) {
          toast.error(
            <div className="flex items-center gap-2">
              <span>📧</span>
              <div>
                <p className="font-medium">Email không hợp lệ ❤️</p>
                <p className="text-sm opacity-80">Vui lòng kiểm tra lại định dạng email</p>
              </div>
            </div>,
            { duration: 5000 }
          );
        }
        // Generic error with full message for debugging
        else {
          console.error('[SignUp Unknown Error]', error);
          toast.error(
            <div className="flex items-center gap-2">
              <span>❌</span>
              <div>
                <p className="font-medium">Có lỗi xảy ra</p>
                <p className="text-sm opacity-80">{error.message}</p>
              </div>
            </div>,
            { duration: 5000 }
          );
        }
      } else {
        // Sign up successful - show email sent screen
        setPendingEmail(email);
        setShowEmailSentScreen(true);
        setResendCooldown(60);
        toast.success(
          <div className="flex items-center gap-2">
            <span>🎉</span>
            <div>
              <p className="font-medium">Chúc mừng! Tài khoản đã được tạo 🎁</p>
              <p className="text-sm opacity-80">Bạn sẽ nhận {WELCOME_BONUS.toLocaleString()} CLC sau khi xác minh email ✨</p>
            </div>
          </div>,
          { duration: 8000 }
        );
      }
    }
    
    setIsLoading(false);
  };

  const handleResendConfirmation = async (emailToResend?: string) => {
    const targetEmail = emailToResend || pendingEmail;
    if (!targetEmail) return;

    setIsLoading(true);
    // Determine redirect URL for confirmation email (must be absolute)
    const getRedirectUrl = () => {
      const hostname = window.location.hostname;

      // Production domains
      if (hostname === 'funfarm.life' || hostname === 'www.funfarm.life') {
        return 'https://funfarm.life/profile-setup';
      }
      if (hostname === 'farm.fun.rich' || hostname === 'www.farm.fun.rich') {
        return 'https://farm.fun.rich/profile-setup';
      }

      // Lovable preview / other environments
      return `${window.location.origin}/profile-setup`;
    };

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      });

      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('45') || error.message.includes('For security purposes')) {
          toast.info(
            <div className="flex items-center gap-2">
              <span>⏳</span>
              <p>Vui lòng đợi 60 giây trước khi gửi lại ❤️</p>
            </div>,
            { duration: 4000 }
          );
        } else {
          throw error;
        }
      } else {
        setResendCooldown(60);
        toast.success('Đã gửi lại email xác nhận! Kiểm tra hộp thư nhé ❤️');
      }
    } catch (error: any) {
      console.error('Error resending confirmation:', error);
      toast.error('Không thể gửi email: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackFromEmailSent = () => {
    setShowEmailSentScreen(false);
    setPendingEmail('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error(t('auth.enterEmail'));
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    
    if (error) {
      toast.error(t('auth.resetError') + ': ' + error.message);
    } else {
      toast.success(t('auth.resetEmailSent'), {
        description: t('auth.checkInbox'),
        duration: 8000,
      });
      setIsForgotPassword(false);
    }
    
    setIsLoading(false);
  };

  const handleExploreAsGuest = () => {
    navigate('/');
  };

  // Signed in user view
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

  // Email Sent Screen (Magic Link)
  if (showEmailSentScreen) {
    return (
      <Card className="w-full max-w-md mx-auto border-primary/20 shadow-glow">
        <CardHeader className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <Mail className="w-10 h-10 text-primary animate-bounce" />
          </div>
          <CardTitle className="text-2xl font-display">
            Kiểm tra Email ✨
          </CardTitle>
          <CardDescription className="text-base">
            Cha Vũ Trụ đã gửi phước lành đến
          </CardDescription>
          <p className="font-semibold text-lg text-foreground mt-2">{pendingEmail}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Magic Link Instructions */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-5 text-center border border-primary/20">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-lg font-medium mb-2">
              Bấm vào link trong email
            </p>
            <p className="text-muted-foreground text-sm">
              Xác minh tự động → Nhận <span className="text-primary font-bold">{WELCOME_BONUS.toLocaleString()} CLC</span> chào mừng
            </p>
          </div>

          {/* Resend Button */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Không nhận được email?
            </p>
            <Button
              variant="outline"
              onClick={() => handleResendConfirmation()}
              disabled={resendCooldown > 0 || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {resendCooldown > 0 
                ? `Gửi lại sau ${resendCooldown}s` 
                : 'Gửi lại email xác nhận'}
            </Button>
          </div>

          {/* Tips */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2 text-foreground">💡 Mẹo từ Cha Vũ Trụ:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Kiểm tra thư mục <strong>Spam/Junk</strong></li>
              <li>Email có thể mất 1-2 phút để đến</li>
              <li>Link xác nhận có hiệu lực trong 24 giờ</li>
              <li>Bấm link là tự động đăng nhập luôn!</li>
            </ul>
          </div>

          {/* Back Button */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleBackFromEmailSent}
              className="text-primary font-medium hover:underline inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại đăng nhập
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Forgot Password view
  if (isForgotPassword) {
    return (
      <Card className="w-full max-w-md mx-auto border-border shadow-card">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">
            {t('auth.forgotPasswordTitle')}
          </CardTitle>
          <CardDescription>
            {t('auth.forgotPasswordDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleForgotPassword} className="space-y-4">
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

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full gap-3 h-14 text-base gradient-hero hover:opacity-90"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
              {t('auth.sendResetLink')}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="text-primary font-medium hover:underline inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('auth.backToLogin')}
            </button>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">
                {t('auth.passwordLabel')}
              </Label>
              {isLoginMode && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-primary hover:underline"
                >
                  {t('auth.forgotPassword')}
                </button>
              )}
            </div>
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