// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Email Verification Modal with OTP support

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Mail, Loader2, CheckCircle, RefreshCw, Sparkles } from 'lucide-react';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

const EmailVerificationModal = ({ isOpen, onClose, onVerified }: EmailVerificationModalProps) => {
  const { user, refreshProfile } = useAuth();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailSent, setEmailSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Send verification email when modal opens
  useEffect(() => {
    if (isOpen && user?.email && !emailSent) {
      handleSendVerificationEmail();
    }
  }, [isOpen, user?.email]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setOtp('');
      setEmailSent(false);
      setIsVerified(false);
    }
  }, [isOpen]);

  const handleSendVerificationEmail = async () => {
    if (!user?.email) {
      toast.error('Không tìm thấy email của bạn');
      return;
    }

    setIsResending(true);
    try {
      // Use Supabase's resend confirmation email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/feed`,
        },
      });

      if (error) {
        // If already confirmed, try sending magic link instead
        if (error.message.includes('already confirmed')) {
          // Update profile to mark email as verified
          await supabase
            .from('profiles')
            .update({ email_verified: true })
            .eq('id', user.id);
          
          await refreshProfile();
          setIsVerified(true);
          toast.success('Email của bạn đã được xác minh rồi! ✨');
          
          setTimeout(() => {
            onVerified?.();
            onClose();
          }, 2000);
          return;
        }
        throw error;
      }

      setEmailSent(true);
      setResendCooldown(60); // 60 seconds cooldown
      toast.success('Đã gửi email xác minh! Kiểm tra hộp thư của bạn nhé ❤️');
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      toast.error('Không thể gửi email: ' + error.message);
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!user?.email || otp.length !== 6) {
      toast.error('Vui lòng nhập đủ 6 số OTP');
      return;
    }

    setIsVerifying(true);
    try {
      // Verify OTP with Supabase
      const { error } = await supabase.auth.verifyOtp({
        email: user.email,
        token: otp,
        type: 'email',
      });

      if (error) {
        throw error;
      }

      // Update profile to mark email as verified
      await supabase
        .from('profiles')
        .update({ email_verified: true })
        .eq('id', user.id);

      await refreshProfile();
      setIsVerified(true);
      toast.success('Xác minh email thành công! Phước lành về với bạn ✨');
      
      setTimeout(() => {
        onVerified?.();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      if (error.message.includes('expired')) {
        toast.error('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
      } else if (error.message.includes('invalid')) {
        toast.error('Mã OTP không đúng. Vui lòng kiểm tra lại.');
      } else {
        toast.error('Xác minh thất bại: ' + error.message);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await handleSendVerificationEmail();
  };

  // Check if user has confirmed their email via link (polling)
  useEffect(() => {
    if (!isOpen || isVerified) return;

    const checkEmailVerified = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.email_confirmed_at) {
        // Update profile
        await supabase
          .from('profiles')
          .update({ email_verified: true })
          .eq('id', currentUser.id);
        
        await refreshProfile();
        setIsVerified(true);
        toast.success('Email đã được xác minh! Phước lành về với bạn ✨');
        
        setTimeout(() => {
          onVerified?.();
          onClose();
        }, 2000);
      }
    };

    // Poll every 3 seconds
    const interval = setInterval(checkEmailVerified, 3000);
    return () => clearInterval(interval);
  }, [isOpen, isVerified]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4">
            {isVerified ? (
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center animate-bounce">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>
          <DialogTitle className="text-xl font-display">
            {isVerified ? 'Xác minh thành công! ✨' : 'Xác minh Email'}
          </DialogTitle>
          <DialogDescription>
            {isVerified ? (
              <span className="text-green-500">Email của bạn đã được xác minh. Phước lành đang về! ❤️</span>
            ) : (
              <>
                Chúng tôi đã gửi mã xác minh đến <span className="font-medium text-foreground">{user?.email}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!isVerified && (
          <div className="space-y-6 py-4">
            {/* OTP Input */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Nhập mã 6 số từ email hoặc click link xác minh trong email
              </p>
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
              className="w-full gap-2 h-12 gradient-hero"
            >
              {isVerifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Xác minh
            </Button>

            {/* Resend Button */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Không nhận được email?
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
                  : 'Gửi lại email xác minh'}
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmailVerificationModal;
