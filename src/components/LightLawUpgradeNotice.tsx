import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Heart, Sparkles, X, ArrowRight, Gift, Clock } from 'lucide-react';

// Ngày bắt đầu áp dụng Luật Ánh Sáng upgrade (có thể điều chỉnh)
const LIGHT_LAW_UPGRADE_START_DATE = new Date('2024-12-20');
const UPGRADE_DEADLINE_DAYS = 7;

interface LightLawUpgradeNoticeProps {
  onDismiss?: () => void;
}

export const LightLawUpgradeNotice = ({ onDismiss }: LightLawUpgradeNoticeProps) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) return;

    // Tính deadline: lấy ngày lớn hơn giữa created_at và LIGHT_LAW_UPGRADE_START_DATE
    const createdAt = new Date(profile.created_at);
    const startDate = createdAt > LIGHT_LAW_UPGRADE_START_DATE ? createdAt : LIGHT_LAW_UPGRADE_START_DATE;
    const deadline = new Date(startDate);
    deadline.setDate(deadline.getDate() + UPGRADE_DEADLINE_DAYS);

    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    setDaysRemaining(Math.max(0, diffDays));
  }, [profile]);

  // Don't show if:
  // - User is not logged in
  // - User is banned
  // - User has already verified (verification_status === 'verified')
  // - User is new (created after the upgrade date - we consider accounts older than 1 day as "old")
  // - User already dismissed

  if (!profile || profile.banned || isDismissed) {
    return null;
  }

  // Check if user already completed verification (Luật Ánh Sáng)
  const isVerified = profile.verification_status === 'verified';
  
  if (isVerified) {
    return null;
  }

  // Check if this is an "old" user (account created more than 1 day ago)
  const createdAt = new Date(profile.created_at);
  const now = new Date();
  const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // Only show for users who registered more than 1 day ago
  if (daysSinceCreation < 1) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleVerify = () => {
    // Navigate to profile-setup with upgrade flag
    navigate('/profile-setup?upgrade=true');
  };

  const isUrgent = daysRemaining !== null && daysRemaining <= 2;
  const isExpired = daysRemaining === 0;

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 p-4 md:p-6 shadow-lg animate-in fade-in slide-in-from-top-2 duration-500 ${
      isUrgent 
        ? 'bg-gradient-to-r from-destructive/20 via-orange-500/20 to-destructive/20 border-destructive/60' 
        : 'bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border-primary/40'
    }`}>
      {/* Sparkle decorations */}
      <div className="absolute top-2 left-4 text-primary/60">
        <Sparkles className="w-5 h-5 animate-pulse" />
      </div>
      <div className="absolute bottom-2 right-4 text-accent/60">
        <Sparkles className="w-4 h-4 animate-pulse delay-300" />
      </div>
      <div className="absolute top-1/2 right-1/4 text-primary/40">
        <Heart className="w-3 h-3 animate-bounce" />
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Đóng"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
            isUrgent 
              ? 'bg-gradient-to-br from-destructive to-orange-500' 
              : 'bg-gradient-to-br from-primary to-accent'
          }`}>
            {isUrgent ? (
              <Clock className="w-8 h-8 text-primary-foreground animate-pulse" />
            ) : (
              <Gift className="w-8 h-8 text-primary-foreground" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg md:text-xl font-bold text-foreground flex items-center justify-center md:justify-start gap-2 flex-wrap">
            <span>Bà con ơi</span>
            <Heart className="w-5 h-5 text-red-500 fill-red-500 animate-pulse" />
            <span>Fun Farm nâng cấp Luật Ánh Sáng!</span>
          </h3>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Hoàn tất xác minh để <span className="text-accent font-semibold">giữ thưởng cũ</span> + 
            <span className="text-primary font-bold"> nhận thêm 50.000 CLC</span> phước lành!
          </p>
          
          {/* Countdown */}
          {daysRemaining !== null && (
            <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
              isExpired
                ? 'bg-destructive/20 text-destructive'
                : isUrgent 
                  ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 animate-pulse' 
                  : 'bg-primary/20 text-primary'
            }`}>
              <Clock className="w-4 h-4" />
              {isExpired ? (
                <span>⚠️ Đã hết hạn - Hoàn tất ngay!</span>
              ) : daysRemaining === 1 ? (
                <span>⏰ Còn 1 ngày cuối cùng!</span>
              ) : (
                <span>⏳ Còn {daysRemaining} ngày để hoàn tất</span>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground/70 mt-1">
            ✨ Avatar thật + Tên thật + Đồng ý Luật Ánh Sáng = Phước lành vĩnh cửu
          </p>
        </div>

        {/* CTA Button */}
        <div className="flex-shrink-0">
          <Button
            onClick={handleVerify}
            className={`border-0 gap-2 shadow-lg hover:shadow-xl transition-shadow group ${
              isUrgent 
                ? 'bg-gradient-to-r from-destructive to-orange-500 hover:from-destructive/90 hover:to-orange-500/90' 
                : 'gradient-hero'
            }`}
            size="lg"
          >
            <span>{isExpired ? 'Hoàn tất ngay!' : 'Hoàn tất xác minh'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Progress hint */}
      <div className="mt-3 flex items-center justify-center md:justify-start gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${profile.avatar_url && profile.avatar_verified ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
          <span>Avatar thật</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${profile.display_name ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
          <span>Tên thật</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          <span>Luật Ánh Sáng</span>
        </div>
      </div>
    </div>
  );
};
