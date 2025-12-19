// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Sparkles, ChevronRight, MapPin, PartyPopper } from 'lucide-react';
import { WELCOME_BONUS, WALLET_CONNECT_BONUS, TOTAL_WELCOME_BONUS } from '@/lib/constants';
import WelcomeBonusModal from '@/components/WelcomeBonusModal';
import { useConfetti } from '@/components/ConfettiProvider';

type ProfileType = 'farmer' | 'fisher' | 'eater' | 'restaurant' | 'distributor' | 'shipper';

const ProfileSetup = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { triggerConfetti } = useConfetti();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<ProfileType | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    location: '',
    bio: '',
  });

  // Trigger confetti when user lands on profile-setup after email verification
  useEffect(() => {
    if (user && !hasTriggeredConfetti) {
      // Small delay to ensure page is rendered
      const timer = setTimeout(() => {
        triggerConfetti('celebration');
        setHasTriggeredConfetti(true);
        
        // Show welcome toast
        toast.success(
          <div className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="font-bold">Xác minh email thành công!</p>
              <p className="text-sm opacity-80">Chào mừng bà con đến FUN FARM ❤️</p>
            </div>
          </div>,
          { duration: 5000 }
        );
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user, hasTriggeredConfetti, triggerConfetti]);

  const profileTypes: { type: ProfileType; emoji: string; titleKey: string; descKey: string }[] = [
    { type: 'farmer', emoji: '🧑‍🌾', titleKey: 'roles.farmer', descKey: 'roles.farmerDesc' },
    { type: 'fisher', emoji: '🎣', titleKey: 'roles.fisher', descKey: 'roles.fisherDesc' },
    { type: 'eater', emoji: '🍽️', titleKey: 'roles.eater', descKey: 'roles.eaterDesc' },
    { type: 'restaurant', emoji: '👨‍🍳', titleKey: 'roles.restaurant', descKey: 'roles.restaurantDesc' },
    { type: 'distributor', emoji: '📦', titleKey: 'roles.distributor', descKey: 'roles.distributorDesc' },
    { type: 'shipper', emoji: '🚚', titleKey: 'roles.shipper', descKey: 'roles.shipperDesc' },
  ];

  const handleTypeSelect = (type: ProfileType) => {
    setSelectedType(type);
  };

  const handleNext = () => {
    if (step === 1 && selectedType) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedType) return;

    setIsLoading(true);
    try {
      // Update profile with selected type (không cần claim welcome bonus ở đây vì đã được trigger tự động)
      const { error } = await supabase
        .from('profiles')
        .update({
          profile_type: selectedType,
          display_name: formData.display_name || profile?.display_name,
          location: formData.location,
          bio: formData.bio,
          welcome_bonus_claimed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      
      // Show welcome modal
      setShowWelcomeModal(true);

    } catch (error: any) {
      toast.error(t('profile.setupFailed') + ': ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
    toast.success(
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-accent" />
        <span>Chúc mừng bạn đã gia nhập FUN FARM! +{WELCOME_BONUS.toLocaleString()} CAMLY</span>
      </div>
    );
    navigate('/feed');
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {step === 1 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-display font-bold mb-2">
                {t('profile.whoAreYou')}
              </h1>
              <p className="text-muted-foreground">
                {t('profile.chooseRole')}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {profileTypes.map(({ type, emoji, titleKey, descKey }) => (
                <Card
                  key={type}
                  className={`cursor-pointer transition-all hover:scale-105 hover:shadow-glow ${
                    selectedType === type
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleTypeSelect(type)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-4xl mb-2">{emoji}</div>
                    <h3 className="font-display font-semibold">{t(titleKey)}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{t(descKey)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              onClick={handleNext}
              disabled={!selectedType}
              className="w-full h-12 gradient-hero border-0 gap-2"
            >
              {t('profile.continue')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <Card className="border-border shadow-card">
              <CardHeader className="text-center">
                <div className="text-5xl mb-2">
                  {profileTypes.find(p => p.type === selectedType)?.emoji}
                </div>
                <CardTitle className="text-2xl font-display">
                  {t('profile.completeProfile')}
                </CardTitle>
                <CardDescription>
                  {t('profile.tellUsMore')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">{t('profile.displayName')}</Label>
                  <Input
                    id="display_name"
                    placeholder={t('profile.displayNamePlaceholder')}
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">{t('profile.location')}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder={t('profile.locationPlaceholder')}
                      className="pl-10"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">{t('profile.bio')}</Label>
                  <Textarea
                    id="bio"
                    placeholder={t('profile.bioPlaceholder')}
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  />
                </div>

                {/* Welcome bonus preview */}
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Phước lành chào mừng</p>
                  <p className="text-2xl font-display font-bold text-accent">
                    🎁 {WELCOME_BONUS.toLocaleString()} CAMLY
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    + Kết nối ví sẽ nhận thêm {WALLET_CONNECT_BONUS.toLocaleString()} CAMLY!
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    {t('profile.back')}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex-1 gradient-hero border-0 gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {t('profile.completeAndClaim')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Welcome Bonus Modal - sau khi đăng ký xong */}
      <WelcomeBonusModal
        isOpen={showWelcomeModal}
        onClose={handleWelcomeModalClose}
        type="registration"
        amount={WELCOME_BONUS}
      />
    </div>
  );
};

export default ProfileSetup;
