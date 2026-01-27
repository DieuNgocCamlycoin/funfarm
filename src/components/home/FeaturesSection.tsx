import { 
  Store, 
  Users, 
  Shield, 
  Bot, 
  Star, 
  Globe,
  Leaf,
  Video
} from "lucide-react";
import { useTranslation } from "react-i18next";

const FeaturesSection = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Store,
      titleKey: "features.directMarketplace",
      descKey: "features.directMarketplaceDesc",
      color: "primary",
    },
    {
      icon: Users,
      titleKey: "features.socialNetwork",
      descKey: "features.socialNetworkDesc",
      color: "secondary",
    },
    {
      icon: Shield,
      titleKey: "features.blockchainTransparency",
      descKey: "features.blockchainTransparencyDesc",
      color: "accent",
    },
    {
      icon: Bot,
      titleKey: "features.angelAI",
      descKey: "features.angelAIDesc",
      color: "primary",
    },
    {
      icon: Star,
      titleKey: "features.reviewReward",
      descKey: "features.reviewRewardDesc",
      color: "secondary",
    },
    {
      icon: Globe,
      titleKey: "features.globalReach",
      descKey: "features.globalReachDesc",
      color: "accent",
    },
  ];

  return (
    <section id="features" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-muted/30" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-4 py-2 mb-6">
            <Leaf className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-secondary">{t('features.badge')}</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-foreground">
            {t('features.title')}{" "}
            <span className="text-gradient-hero">{t('features.titleHighlight')}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('features.subtitle')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.titleKey}
              className="group bg-card rounded-2xl p-8 border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-card hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div 
                className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
                  feature.color === 'primary' ? 'bg-primary/10' :
                  feature.color === 'secondary' ? 'bg-secondary/10' :
                  'bg-accent/10'
                }`}
              >
                <feature.icon 
                  className={`w-7 h-7 ${
                    feature.color === 'primary' ? 'text-primary' :
                    feature.color === 'secondary' ? 'text-secondary' :
                    'text-accent'
                  }`} 
                />
              </div>
              <h3 className="font-display font-semibold text-xl mb-3 text-foreground">
                {t(feature.titleKey)}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t(feature.descKey)}
              </p>
            </div>
          ))}
        </div>

        {/* Live from Farm Banner */}
        <div className="mt-16 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-3xl p-8 md:p-12 border border-border">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 gradient-hero rounded-2xl flex items-center justify-center shadow-glow animate-pulse-glow">
                <Video className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-display font-bold text-2xl md:text-3xl mb-3 text-foreground">
                {t('features.liveFromFarm')}
              </h3>
              <p className="text-muted-foreground text-lg">
                {t('features.liveFromFarmDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
