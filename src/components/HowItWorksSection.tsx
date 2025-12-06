import { UserPlus, Package, Truck, Star, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const HowItWorksSection = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: UserPlus,
      titleKey: "howItWorks.step1Title",
      descKey: "howItWorks.step1Desc",
      details: [
        "howItWorks.step1Detail1",
        "howItWorks.step1Detail2",
        "howItWorks.step1Detail3"
      ],
    },
    {
      icon: Package,
      titleKey: "howItWorks.step2Title",
      descKey: "howItWorks.step2Desc",
      details: [
        "howItWorks.step2Detail1",
        "howItWorks.step2Detail2",
        "howItWorks.step2Detail3"
      ],
    },
    {
      icon: Truck,
      titleKey: "howItWorks.step3Title",
      descKey: "howItWorks.step3Desc",
      details: [
        "howItWorks.step3Detail1",
        "howItWorks.step3Detail2",
        "howItWorks.step3Detail3"
      ],
    },
    {
      icon: Star,
      titleKey: "howItWorks.step4Title",
      descKey: "howItWorks.step4Desc",
      details: [
        "howItWorks.step4Detail1",
        "howItWorks.step4Detail2",
        "howItWorks.step4Detail3"
      ],
    },
  ];

  return (
    <section id="how-it-works" className="py-24 relative bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t('howItWorks.badge')}</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-foreground">
            <span className="text-gradient-hero">{t('howItWorks.title')}</span>{" "}
            {t('howItWorks.titleSuffix')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.titleKey} className="relative">
                {/* Step Number Circle */}
                <div className="hidden lg:flex absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-12 gradient-hero rounded-full items-center justify-center shadow-glow z-10">
                  <span className="font-display font-bold text-lg text-primary-foreground">
                    {index + 1}
                  </span>
                </div>

                <div className="bg-card rounded-2xl p-6 pt-10 lg:pt-14 border border-border h-full hover:border-primary/30 transition-all duration-300 hover:shadow-card">
                  <div className="lg:hidden flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 gradient-hero rounded-full flex items-center justify-center">
                      <span className="font-display font-bold text-sm text-primary-foreground">
                        {index + 1}
                      </span>
                    </div>
                  </div>

                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>

                  <h3 className="font-display font-semibold text-xl mb-3 text-foreground">
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t(step.descKey)}
                  </p>

                  <ul className="space-y-2">
                    {step.details.map((detailKey, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {t(detailKey)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
