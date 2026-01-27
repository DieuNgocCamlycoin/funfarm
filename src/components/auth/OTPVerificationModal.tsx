import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Mail, RefreshCw, CheckCircle2, Sparkles, ArrowLeft, Edit2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WELCOME_BONUS } from '@/lib/constants';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  email: string;
  userId: string;
}

export function OTPVerificationModal({ 
  isOpen, 
  onClose, 
  onVerified, 
  email: initialEmail, 
  userId 
}: OTPVerificationModalProps) {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isVerified, setIsVerified] = useState(false);
  
  // Email editing state
  const [currentEmail, setCurrentEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Sync email when prop changes
  useEffect(() => {
    setCurrentEmail(initialEmail);
  }, [initialEmail]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp('');
      setIsVerified(false);
      setIsEditingEmail(false);
      setNewEmail('');
    }
  }, [isOpen]);

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && !isVerifying && !isVerified) {
      handleVerify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error('Vui lòng nhập đủ 6 số');
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { email: currentEmail, userId, otp }
      });

      if (error) throw error;

      if (data.success) {
        setIsVerified(true);
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-bold">Xác minh thành công! 🎉</p>
              <p className="text-sm">Chào mừng đến Fun Farm ❤️</p>
            </div>
          </div>,
          { duration: 3000 }
        );
        // Delay before closing to show success state
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        throw new Error(data.message || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      const message = error.message || 'Không thể xác minh OTP';
      
      // Parse error response if available
      if (error.context?.body) {
        try {
          const body = JSON.parse(error.context.body);
          toast.error(body.message || message);
        } catch {
          toast.error(message);
        }
      } else {
        toast.error(message);
      }
      
      setOtp(''); // Clear OTP on error
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email: currentEmail, userId }
      });

      if (error) throw error;

      if (data.success) {
        setResendCooldown(60);
        toast.success('Đã gửi mã OTP mới! Kiểm tra email nhé ❤️');
      } else if (data.error === 'rate_limit') {
        setResendCooldown(data.remainingSeconds || 60);
        toast.info(data.message);
      } else {
        throw new Error(data.message || 'Failed to resend');
      }
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      toast.error('Không thể gửi lại mã. Vui lòng thử lại.');
    } finally {
      setIsResending(false);
    }
  };

  const handleStartEditEmail = () => {
    setNewEmail('');
    setIsEditingEmail(true);
  };

  const handleCancelEditEmail = () => {
    setIsEditingEmail(false);
    setNewEmail('');
  };

  const handleChangeEmail = async () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      toast.error('Vui lòng nhập email hợp lệ');
      return;
    }

    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      toast.error('Email mới phải khác email cũ');
      return;
    }

    setIsChangingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-email-otp', {
        body: { 
          userId, 
          oldEmail: currentEmail, 
          newEmail 
        }
      });

      if (error) throw error;

      if (data.success) {
        setCurrentEmail(newEmail);
        setIsEditingEmail(false);
        setNewEmail('');
        setOtp('');
        setResendCooldown(60);
        toast.success(
          <div>
            <p className="font-medium">Đã đổi email thành công! 📧</p>
            <p className="text-sm opacity-80">Mã OTP mới đã được gửi đến {newEmail}</p>
          </div>
        );
      } else {
        throw new Error(data.message || 'Failed to change email');
      }
    } catch (error: any) {
      console.error('Change email error:', error);
      const message = error.message || 'Không thể đổi email';
      
      if (error.context?.body) {
        try {
          const body = JSON.parse(error.context.body);
          toast.error(body.message || message);
        } catch {
          toast.error(message);
        }
      } else {
        toast.error(message);
      }
    } finally {
      setIsChangingEmail(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isVerified && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-colors ${
            isVerified ? 'bg-green-100' : 'bg-primary/10'
          }`}>
            {isVerified ? (
              <CheckCircle2 className="w-8 h-8 text-green-600 animate-pulse" />
            ) : (
              <Mail className="w-8 h-8 text-primary animate-bounce" />
            )}
          </div>
          <DialogTitle className="text-xl font-display">
            {isVerified ? 'Xác minh thành công! ✨' : 'Nhập mã xác minh'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isVerified ? (
              'Đang chuyển hướng...'
            ) : isEditingEmail ? (
              'Nhập email mới để nhận mã OTP'
            ) : (
              <>
                Chúng tôi đã gửi mã 6 số đến
                <br />
                <span className="font-semibold text-foreground inline-flex items-center gap-1">
                  {currentEmail}
                  <button
                    onClick={handleStartEditEmail}
                    className="text-primary hover:text-primary/80 transition-colors p-1"
                    title="Đổi email"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!isVerified && (
          <div className="space-y-6 py-4">
            {/* Email Editing Mode */}
            {isEditingEmail ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Nhập email mới"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={isChangingEmail}
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCancelEditEmail}
                    disabled={isChangingEmail}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleChangeEmail}
                  disabled={!newEmail || isChangingEmail}
                  className="w-full gap-2"
                >
                  {isChangingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Xác nhận đổi email
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Mã OTP mới sẽ được gửi đến email này
                </p>
              </div>
            ) : (
              <>
                {/* OTP Input */}
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
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
                  onClick={handleVerify}
                  disabled={otp.length !== 6 || isVerifying}
                  className="w-full h-12 gradient-hero border-0 gap-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang xác minh...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Xác minh
                    </>
                  )}
                </Button>

                {/* Bonus reminder */}
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-3 text-center border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    Xác minh để nhận <span className="text-primary font-bold">{WELCOME_BONUS.toLocaleString()} CLC</span> chào mừng! 🎁
                  </p>
                </div>

                {/* Resend Section */}
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Không nhận được mã?
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isResending}
                    className="gap-2"
                  >
                    {isResending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {resendCooldown > 0 
                      ? `Gửi lại sau ${resendCooldown}s` 
                      : 'Gửi lại mã'}
                  </Button>
                </div>

                {/* Tips */}
                <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">💡 Mẹo:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Kiểm tra thư mục Spam/Junk</li>
                    <li>Mã có hiệu lực trong 10 phút</li>
                    <li>Tối đa 5 lần nhập sai</li>
                    <li>Nhập sai email? Bấm biểu tượng ✏️ để đổi</li>
                  </ul>
                </div>

                {/* Back button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full text-center text-sm text-primary hover:underline inline-flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại
                </button>
              </>
            )}
          </div>
        )}

        {isVerified && (
          <div className="py-8 text-center">
            <div className="animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
