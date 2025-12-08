import { Gift, Rocket, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import camlyCoinLogo from '@/assets/camly_coin.png';

const EarnSection = () => {
  const { t } = useTranslation();

  const earnMethods = [
    {
      icon: Gift,
      titleKey: "earn.joinEarn",
      descKey: "earn.joinEarnDesc",
      rewardKey: "earn.welcomeBonus",
      color: "primary",
    },
    {
      icon: Rocket,
      titleKey: "earn.useEarn",
      descKey: "earn.useEarnDesc",
      rewardKey: "earn.perAction",
      color: "secondary",
    },
    {
      icon: TrendingUp,
      titleKey: "earn.growEarn",
      descKey: "earn.growEarnDesc",
      rewardKey: "earn.bonusMultiplier",
      color: "accent",
    },
  ];

  return (
    <section id="earn" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-2 mb-6">
            <img src={camlyCoinLogo} alt="CAMLY" className="w-5 h-5 object-contain" />
            <span className="text-sm font-medium text-accent">{t('earn.badge')}</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-foreground">
            {t('earn.title')}{" "}
            <span className="text-gradient-earth">{t('earn.titleHighlight')}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('earn.subtitle')}
          </p>
        </div>

        {/* Earn Methods */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {earnMethods.map((method, index) => (
            <div
              key={method.titleKey}
              className="relative group"
            >
              <div className="bg-card rounded-3xl p-8 border border-border h-full transition-all duration-300 hover:border-accent/30 hover:shadow-card">
                {/* Step Number */}
                <div className="absolute -top-4 left-8">
                  <span className="gradient-earth text-primary-foreground font-display font-bold text-sm px-4 py-1 rounded-full">
                    {t('earn.step')} {index + 1}
                  </span>
                </div>

                <div 
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mt-4 mb-6 ${
                    method.color === 'primary' ? 'bg-primary/10' :
                    method.color === 'secondary' ? 'bg-secondary/10' :
                    'bg-accent/10'
                  }`}
                >
                  <method.icon 
                    className={`w-8 h-8 ${
                      method.color === 'primary' ? 'text-primary' :
                      method.color === 'secondary' ? 'text-secondary' :
                      'text-accent'
                    }`}
                  />
                </div>

                <h3 className="font-display font-bold text-2xl mb-3 text-foreground">
                  {t(method.titleKey)}
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {t(method.descKey)}
                </p>

                <div className="flex items-center gap-2">
                  <img src={camlyCoinLogo} alt="CAMLY" className="w-6 h-6 object-contain" />
                  <span className="font-semibold text-accent">{t(method.rewardKey)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CAMLY Token Card */}
        <div className="bg-card rounded-3xl border border-border overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-12">
              <div className="inline-flex items-center gap-2 bg-accent/10 rounded-full px-4 py-2 mb-6">
                <span className="font-display font-bold text-accent">CAMLY</span>
                <span className="text-sm text-muted-foreground">{t('earn.camlyToken')}</span>
              </div>
              <h3 className="font-display font-bold text-3xl md:text-4xl mb-4 text-foreground">
                {t('earn.camlyTitle')}{" "}
                <span className="text-gradient-earth">{t('earn.camlyHighlight')}</span>
              </h3>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                {t('earn.camlyDesc')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="accent" size="lg" className="group">
                  {t('earn.learnCamly')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
            <div className="relative min-h-[250px] bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
              <img 
                src={camlyCoinLogo} 
                alt="CAMLY Coin" 
                className="w-36 h-36 object-contain drop-shadow-xl animate-pulse-glow"
              />
              <div className="absolute top-8 right-8 w-8 h-8 bg-accent/30 rounded-full animate-float" />
              <div className="absolute bottom-12 left-12 w-6 h-6 bg-accent/20 rounded-full animate-float-delayed" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EarnSection;
