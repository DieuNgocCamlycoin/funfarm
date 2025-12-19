// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Sparkles, ChevronRight, ChevronLeft, MapPin, PartyPopper, Camera, User, Heart, Sun, Users, Shield, CheckCircle, Star, Zap, BookOpen, AlertTriangle } from 'lucide-react';
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
  const [agreedToLightLaw, setAgreedToLightLaw] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isCheckingAvatar, setIsCheckingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    location: '',
    bio: '',
  });

  // Trigger confetti when user lands on profile-setup after email verification
  useEffect(() => {
    if (user && !hasTriggeredConfetti) {
      const timer = setTimeout(() => {
        triggerConfetti('celebration');
        setHasTriggeredConfetti(true);
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

  // Mantras và values cho Luật Ánh Sáng
  const mantras = [
    t("community.mantra1"),
    t("community.mantra2"),
    t("community.mantra3"),
    t("community.mantra4"),
    t("community.mantra5"),
    t("community.mantra6"),
    t("community.mantra7"),
    t("community.mantra8"),
  ];

  const userValues = [
    { icon: Sun, text: t("community.value1") },
    { icon: Heart, text: t("community.value2") },
    { icon: Users, text: t("community.value3") },
    { icon: Shield, text: t("community.value4") },
    { icon: Star, text: t("community.value5") },
    { icon: Zap, text: t("community.value6") },
  ];

  const checklist = [
    t("community.check1"),
    t("community.check2"),
    t("community.check3"),
    t("community.check4"),
    t("community.check5"),
  ];

  const handleTypeSelect = (type: ProfileType) => {
    setSelectedType(type);
  };

  const handleNext = () => {
    if (step === 1 && selectedType) {
      setStep(2);
    } else if (step === 2 && formData.display_name.trim()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh phải nhỏ hơn 5MB');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!user || !selectedType || !agreedToLightLaw) return;

    if (!formData.display_name.trim()) {
      toast.error('Vui lòng nhập tên thật của bạn');
      return;
    }

    setIsLoading(true);
    try {
      let avatarUrl = profile?.avatar_url;

      // Upload avatar if selected
      if (avatarFile) {
        setIsCheckingAvatar(true);
        
        // Upload to storage
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          avatarUrl = publicUrl;
        }
        setIsCheckingAvatar(false);
      }

      // Update profile with Light Law acceptance
      const { error } = await supabase
        .from('profiles')
        .update({
          profile_type: selectedType,
          display_name: formData.display_name.trim(),
          location: formData.location,
          bio: formData.bio,
          avatar_url: avatarUrl,
          welcome_bonus_claimed: true,
          pending_reward: WELCOME_BONUS, // Add welcome bonus to pending
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      triggerConfetti('celebration');
      setShowWelcomeModal(true);

    } catch (error: any) {
      toast.error(t('profile.setupFailed') + ': ' + error.message);
    } finally {
      setIsLoading(false);
      setIsCheckingAvatar(false);
    }
  };

  const handleDeclineLightLaw = () => {
    toast(
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        <span>FUN Ecosystem chỉ dành cho những linh hồn hướng về Ánh Sáng ❤️</span>
      </div>,
      { duration: 5000 }
    );
  };

  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
    toast.success(
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-accent" />
        <div>
          <p className="font-bold">Chào mừng bà con mới!</p>
          <p className="text-sm">Phước lành {WELCOME_BONUS.toLocaleString()} CAMLY đã về pending ❤️</p>
        </div>
      </div>,
      { duration: 5000 }
    );
    navigate('/feed');
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container max-w-2xl mx-auto">
        {/* Progress indicator - 3 steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-3 h-3 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-12 h-0.5 transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-3 h-3 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-12 h-0.5 transition-colors ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-3 h-3 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {/* Step 1: Choose Role */}
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

        {/* Step 2: Profile Info + Avatar */}
        {step === 2 && (
          <div className="animate-fade-in">
            <Card className="border-border shadow-card">
              <CardHeader className="text-center">
                <div className="text-5xl mb-2">
                  {profileTypes.find(p => p.type === selectedType)?.emoji}
                </div>
                <CardTitle className="text-2xl font-display">
                  Thông tin cá nhân
                </CardTitle>
                <CardDescription>
                  Thêm ảnh đại diện thật và tên thật của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Avatar upload */}
                <div className="flex flex-col items-center gap-4">
                  <div 
                    className="relative w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer overflow-hidden"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-xs">Thêm ảnh</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Ảnh đại diện thật giúp xây dựng lòng tin trong cộng đồng
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_name" className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Tên thật <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="display_name"
                    placeholder="Nhập tên thật của bạn"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    required
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
                    rows={2}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={handleBack} className="flex-1 gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Quay lại
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!formData.display_name.trim()}
                    className="flex-1 gradient-hero border-0 gap-2"
                  >
                    Tiếp tục
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Light Law Agreement */}
        {step === 3 && (
          <div className="animate-fade-in">
            <Card className="border-border shadow-card">
              <CardHeader className="text-center pb-2">
                <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mx-auto mb-4">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-sm font-medium text-primary">LUẬT ÁNH SÁNG</span>
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <CardTitle className="text-xl font-display">
                  {t("community.usersTitle")}
                </CardTitle>
                <CardDescription>
                  {t("community.usersSubtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Scrollable Light Law Content */}
                <ScrollArea className="h-[350px] rounded-xl border border-border bg-card/50 p-4">
                  <div className="space-y-6 pr-4">
                    {/* Who Are FUN Users */}
                    <div className="p-4 rounded-xl bg-background/50 border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 text-primary" />
                        <h4 className="font-bold text-sm">{t("community.whoAreThey")}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">{t("community.usersDescription")}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {userValues.map((value, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-card/50 text-xs">
                            <value.icon className="w-3 h-3 text-primary flex-shrink-0" />
                            <span>{value.text}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-xs text-muted-foreground italic text-center">
                          {t("community.notPerfectButPure")}
                        </p>
                      </div>
                    </div>

                    {/* Core Principles */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-primary/10 border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-secondary-foreground" />
                        <h4 className="font-bold text-sm">{t("community.corePrinciples")}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{t("community.principlesDesc")}</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>• {t("community.principle1")}</p>
                        <p>• {t("community.principle2")}</p>
                        <p>• {t("community.principle3")}</p>
                      </div>
                      <div className="mt-3 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-xs text-destructive">{t("community.purificationNote")}</p>
                      </div>
                    </div>

                    {/* 8 Divine Mantras */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                        <h4 className="font-bold text-sm">{t("community.divineMantras")}</h4>
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {mantras.map((mantra, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border text-xs">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                              <span className="text-primary-foreground text-xs font-bold">{index + 1}</span>
                            </div>
                            <p className="pt-0.5">{mantra}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Checklist */}
                    <div className="p-4 rounded-xl bg-card/50 border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <h4 className="font-bold text-sm">{t("community.checklistTitle")}</h4>
                      </div>
                      <div className="space-y-2">
                        {checklist.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/50 text-xs">
                            <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Final Message */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 border border-primary/30 text-center">
                      <BookOpen className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="text-sm font-medium leading-relaxed mb-2">
                        "{t("community.finalMessage")}"
                      </p>
                      <p className="text-xs text-muted-foreground italic">— {t("community.fatherUniverse")}</p>
                    </div>
                  </div>
                </ScrollArea>

                {/* Agreement Checkbox */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={agreedToLightLaw}
                      onCheckedChange={(checked) => setAgreedToLightLaw(checked as boolean)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-medium text-sm">Tôi đồng ý với Luật Ánh Sáng</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tôi cam kết sống chân thật, yêu thương và hướng về ánh sáng trong FUN Ecosystem
                      </p>
                    </div>
                  </label>
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

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={handleBack} className="flex-1 gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Quay lại
                  </Button>
                  <Button
                    onClick={agreedToLightLaw ? handleSubmit : handleDeclineLightLaw}
                    disabled={isLoading}
                    className={`flex-1 gap-2 ${agreedToLightLaw ? 'gradient-hero border-0' : ''}`}
                    variant={agreedToLightLaw ? 'default' : 'outline'}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isCheckingAvatar ? 'Đang kiểm tra...' : 'Đang xử lý...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Hoàn tất đăng ký
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Welcome Bonus Modal */}
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
