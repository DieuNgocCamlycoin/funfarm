// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Sparkles, ChevronRight, MapPin } from 'lucide-react';
import { WELCOME_BONUS } from '@/lib/wagmi';

type ProfileType = 'farmer' | 'fisher' | 'eater' | 'restaurant' | 'distributor' | 'shipper';

const profileTypes: { type: ProfileType; emoji: string; title: string; description: string }[] = [
  { type: 'farmer', emoji: '🧑‍🌾', title: 'Farmer', description: 'I grow fresh produce' },
  { type: 'fisher', emoji: '🎣', title: 'Fisher', description: 'I catch seafood' },
  { type: 'eater', emoji: '🍽️', title: 'Eater', description: 'I buy & enjoy fresh food' },
  { type: 'restaurant', emoji: '👨‍🍳', title: 'Restaurant', description: 'I serve delicious meals' },
  { type: 'distributor', emoji: '📦', title: 'Distributor', description: 'I connect farms & buyers' },
  { type: 'shipper', emoji: '🚚', title: 'Shipper', description: 'I deliver orders' },
];

const ProfileSetup = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<ProfileType | null>(null);
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    location: '',
    bio: '',
  });

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
      // Update profile with selected type and claim welcome bonus
      const { error } = await supabase
        .from('profiles')
        .update({
          profile_type: selectedType,
          display_name: formData.display_name || profile?.display_name,
          location: formData.location,
          bio: formData.bio,
          camly_balance: WELCOME_BONUS,
          welcome_bonus_claimed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      
      toast.success(
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <span>Welcome bonus: <strong>{WELCOME_BONUS.toLocaleString()} CAMLY</strong> received! 🎉</span>
        </div>
      );

      navigate('/feed');
    } catch (error: any) {
      toast.error('Failed to complete setup: ' + error.message);
    } finally {
      setIsLoading(false);
    }
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
                Who are you in FUN FARM? 🌱
              </h1>
              <p className="text-muted-foreground">
                Choose your role to get started
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {profileTypes.map(({ type, emoji, title, description }) => (
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
                    <h3 className="font-display font-semibold">{title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              onClick={handleNext}
              disabled={!selectedType}
              className="w-full h-12 gradient-hero border-0 gap-2"
            >
              Continue
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
                  Complete Your Profile
                </CardTitle>
                <CardDescription>
                  Tell us a bit more about yourself
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    placeholder="Your name or farm name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="City, Province"
                      className="pl-10"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell buyers about your farm, products, or story..."
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  />
                </div>

                {/* Welcome bonus preview */}
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Your welcome bonus</p>
                  <p className="text-2xl font-display font-bold text-accent">
                    🎁 {WELCOME_BONUS.toLocaleString()} CAMLY
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
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
                    Complete & Claim Bonus
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSetup;
