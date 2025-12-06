import { Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const CommunitySection = () => {
  const { t } = useTranslation();

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

  return (
    <section id="community" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-hero opacity-5" />
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-float-delayed" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Community Values */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t("community.ourCommunity")}</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-foreground">
            {t("community.builtOn")}{" "}
            <span className="text-gradient-hero">{t("community.loveAndTrust")}</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("community.communityDesc")}
          </p>
        </div>

        {/* Divine Mantras */}
        <div className="bg-card rounded-3xl border border-border p-8 md:p-12 mb-16 relative overflow-hidden">
          {/* Sparkle background effect */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 left-8 w-2 h-2 bg-accent rounded-full animate-sparkle" />
            <div className="absolute top-12 right-16 w-1.5 h-1.5 bg-primary rounded-full animate-sparkle-delayed" />
            <div className="absolute bottom-8 left-1/4 w-2 h-2 bg-secondary rounded-full animate-sparkle" />
            <div className="absolute top-1/3 right-8 w-1 h-1 bg-accent rounded-full animate-sparkle-delayed" />
            <div className="absolute bottom-16 right-1/3 w-1.5 h-1.5 bg-primary rounded-full animate-sparkle" />
          </div>

          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
              <span className="font-display text-xl md:text-2xl font-bold text-gradient-hero animate-shimmer">
                {t("community.divineMantras")}
              </span>
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            </div>
            <p className="text-muted-foreground">
              {t("community.mantrasSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 relative z-10">
            {mantras.map((mantra, index) => (
              <div
                key={index}
                className="group flex items-start gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-300 hover:scale-[1.02] hover:shadow-glow"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="flex-shrink-0 w-10 h-10 gradient-earth rounded-full flex items-center justify-center font-display font-bold text-sm text-primary-foreground shadow-lg group-hover:animate-pulse">
                  {index + 1}
                </span>
                <p className="text-foreground font-semibold text-base md:text-lg leading-relaxed pt-1.5 group-hover:text-primary transition-colors">
                  "{mantra}"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h3 className="font-display text-3xl md:text-4xl font-bold mb-6 text-foreground">
            {t("community.readyToJoin")}
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            {t("community.ctaDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl">
              {t("community.joinToday")}
            </Button>
            <Button variant="glass" size="xl">
              {t("community.readWhitepaper")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;