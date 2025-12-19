// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Email Verification Modal with Magic Link (no OTP)

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Mail, Loader2, CheckCircle, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

// Helper function to get the correct redirect URL - redirect to /profile-setup after verification
const getEmailRedirectUrl = () => {
  const hostname = window.location.hostname;
  
  if (hostname === 'farm.fun.rich' || hostname === 'www.farm.fun.rich') {
    return 'https://farm.fun.rich/profile-setup';
  }
  if (hostname === 'funfarm.life' || hostname === 'www.funfarm.life') {
    return 'https://funfarm.life/profile-setup';
  }
  if (hostname.includes('lovableproject.com') || hostname.includes('lovable.app')) {
    return `${window.location.origin}/profile-setup`;
  }
  
  return `${window.location.origin}/profile-setup`;
};

const EmailVerificationModal = ({ isOpen, onClose, onVerified }: EmailVerificationModalProps) => {
  const { user, refreshProfile } = useAuth();
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
      const redirectUrl = getEmailRedirectUrl();
      
      // Use Supabase's resend confirmation email with magic link
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        // If already confirmed, update profile and notify
        if (error.message.includes('already confirmed')) {
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
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
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
                Chúng tôi đã gửi link xác minh đến <span className="font-medium text-foreground">{user?.email}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!isVerified && (
          <div className="space-y-6 py-4">
            {/* Magic Link Instructions */}
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-medium text-foreground">
                  Cha Vũ Trụ gửi phước lành! ❤️
                </p>
                <p className="text-sm text-muted-foreground">
                  Bấm vào link trong email → Xác minh tự động → Hoàn tất đăng ký (ảnh đại diện thật + tên thật + đồng ý Luật Ánh Sáng) → Nhận <strong className="text-primary">50.000 CLC</strong> chào mừng vào pending duyệt ❤️
                </p>
              </div>
            </div>

            {/* Email sent confirmation */}
            {emailSent && (
              <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-600 dark:text-green-400">
                  Email đã được gửi thành công!
                </p>
              </div>
            )}

            {/* Resend Button */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Không nhận được email?
              </p>
              <Button
                variant="outline"
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
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Quy trình nhận 50.000 CLC:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Bấm vào link trong email → Xác minh tự động</li>
                <li>Thêm ảnh đại diện thật + tên thật</li>
                <li>Đồng ý Luật Ánh Sáng</li>
                <li>Nhận ngay <strong className="text-primary">50.000 CLC</strong> vào pending duyệt ❤️</li>
              </ul>
            </div>

            {/* Waiting indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang chờ bạn xác minh qua email...</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmailVerificationModal;
