// 🌱 Divine Mantra: "Farm to Table, Fair & Fast"
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, CheckCircle2, LogOut, Eye, EyeOff, Mail, Lock, Gift, ArrowLeft, KeyRound, Sparkles, RefreshCw } from 'lucide-react';
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
  
  // OTP verification states
  const [showOTPScreen, setShowOTPScreen] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pendingEmail, setPendingEmail] = useState('');

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
          // User exists but email not verified - show OTP screen
          setPendingEmail(email);
          setShowOTPScreen(true);
          await handleResendOTP(email);
          toast.info('Email chưa xác minh. Vui lòng nhập mã OTP!');
        } else {
          toast.error(t('auth.signInError') + ': ' + error.message);
        }
      } else {
        toast.success(t('auth.welcomeBack'));
      }
    } else {
      // Sign up flow - register then show OTP screen
      const { error } = await signUp(email, password);
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          // User exists - try to resend OTP
          setPendingEmail(email);
          setShowOTPScreen(true);
          await handleResendOTP(email);
          toast.info('Tài khoản đã tồn tại. Vui lòng xác minh email!');
        } else if (error.message.includes('rate limit') || error.message.includes('45')) {
          toast.error('Vui lòng đợi 45 giây trước khi thử lại');
        } else {
          toast.error(t('auth.signUpError') + ': ' + error.message);
        }
      } else {
        // Sign up successful - show OTP screen
        setPendingEmail(email);
        setShowOTPScreen(true);
        setResendCooldown(60);
        toast.success('Đăng ký thành công! Kiểm tra email để nhận mã OTP ❤️', {
          duration: 5000,
        });
      }
    }
    
    setIsLoading(false);
  };

  const handleResendOTP = async (emailToResend?: string) => {
    const targetEmail = emailToResend || pendingEmail;
    if (!targetEmail) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/feed`,
        },
      });

      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('45')) {
          toast.error('Vui lòng đợi 45 giây trước khi gửi lại');
        } else {
          throw error;
        }
      } else {
        setResendCooldown(60);
        toast.success('Đã gửi lại mã OTP! Kiểm tra email nhé ❤️');
      }
    } catch (error: any) {
      console.error('Error resending OTP:', error);
      toast.error('Không thể gửi email: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Vui lòng nhập đủ 6 số OTP');
      return;
    }

    setIsVerifying(true);
    try {
      // Verify OTP with Supabase
      const { error, data } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otp,
        type: 'signup',
      });

      if (error) {
        if (error.message.includes('expired') || error.message.includes('Token has expired')) {
          toast.error('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới!');
        } else if (error.message.includes('invalid') || error.message.includes('Invalid')) {
          toast.error('Mã OTP không đúng. Vui lòng kiểm tra lại!');
        } else {
          throw error;
        }
        return;
      }

      // OTP verified successfully - user is now logged in
      if (data.user) {
        // Update profile to mark email as verified
        await supabase
          .from('profiles')
          .update({ email_verified: true })
          .eq('id', data.user.id);

        await refreshProfile();
        
        toast.success(`Chào mừng bà con mới! Phước lành ${WELCOME_BONUS.toLocaleString()} CLC đã về ví ❤️`, {
          duration: 6000,
        });
        
        // Redirect to profile setup or feed
        setTimeout(() => {
          navigate('/profile-setup');
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error('Xác minh thất bại: ' + error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackFromOTP = () => {
    setShowOTPScreen(false);
    setOtp('');
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

  // OTP Verification Screen
  if (showOTPScreen) {
    return (
      <Card className="w-full max-w-md mx-auto border-primary/20 shadow-glow">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">
            Xác minh Email ✨
          </CardTitle>
          <CardDescription>
            Nhập mã 6 số đã gửi đến <span className="font-medium text-foreground">{pendingEmail}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OTP Input */}
          <div className="flex flex-col items-center gap-4">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => setOtp(value)}
              disabled={isVerifying}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerifyOTP}
            disabled={otp.length !== 6 || isVerifying}
            className="w-full gap-2 h-14 gradient-hero hover:opacity-90"
          >
            {isVerifying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            Xác minh & Nhận {WELCOME_BONUS.toLocaleString()} CLC
          </Button>

          {/* Resend Button */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Không nhận được email?
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResendOTP()}
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
                : 'Gửi lại mã OTP'}
            </Button>
          </div>

          {/* Tips */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">💡 Mẹo:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Kiểm tra thư mục Spam/Junk</li>
              <li>Email có thể mất 1-2 phút để đến</li>
              <li>Mã OTP có hiệu lực trong 60 phút</li>
            </ul>
          </div>

          {/* Back Button */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleBackFromOTP}
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