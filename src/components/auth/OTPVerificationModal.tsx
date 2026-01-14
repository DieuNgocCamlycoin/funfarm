import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Mail, RefreshCw, CheckCircle2, Sparkles, ArrowLeft } from 'lucide-react';
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
  email, 
  userId 
}: OTPVerificationModalProps) {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isVerified, setIsVerified] = useState(false);

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
        body: { email, userId, otp }
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
        body: { email, userId }
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
            ) : (
              <>
                Chúng tôi đã gửi mã 6 số đến
                <br />
                <span className="font-semibold text-foreground">{email}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!isVerified && (
          <div className="space-y-6 py-4">
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
