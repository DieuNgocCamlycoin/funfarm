import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, Sun, Users, Shield, CheckCircle, Star, Zap, BookOpen } from "lucide-react";

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

  return (
    <section id="community" className="py-24 relative overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t("community.ecosystemBadge")}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">{t("community.usersTitle")}</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t("community.usersSubtitle")}
          </p>
        </div>

        {/* Who Are FUN Users */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">{t("community.whoAreThey")}</h3>
            </div>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {t("community.usersDescription")}
            </p>
            
            {/* User Values Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userValues.map((value, index) => (
                <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/30 transition-colors">
                  <value.icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">{value.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground italic text-center">
                {t("community.notPerfectButPure")}
              </p>
            </div>
          </div>
        </div>

        {/* Core Principles */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="bg-gradient-to-br from-secondary/10 to-primary/10 border border-border rounded-2xl p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-secondary-foreground" />
              </div>
              <h3 className="text-2xl font-bold">{t("community.corePrinciples")}</h3>
            </div>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              {t("community.principlesDesc")}
            </p>
            <div className="space-y-3 text-muted-foreground">
              <p>• {t("community.principle1")}</p>
              <p>• {t("community.principle2")}</p>
              <p>• {t("community.principle3")}</p>
            </div>
            <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm font-medium text-destructive">
                {t("community.purificationNote")}
              </p>
            </div>
          </div>
        </div>

        {/* 8 Divine Mantras */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <h3 className="text-3xl font-bold">{t("community.divineMantras")}</h3>
              <Sparkles className="w-5 h-5 text-primary animate-pulse delay-500" />
            </div>
            <p className="text-muted-foreground">{t("community.mantrasSubtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mantras.map((mantra, index) => (
              <div
                key={index}
                className="group relative p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <span className="text-primary-foreground font-bold">{index + 1}</span>
                  </div>
                  <p className="text-foreground font-medium leading-relaxed pt-1.5">{mantra}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Checklist */}
        <div className="max-w-3xl mx-auto mb-20">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold">{t("community.checklistTitle")}</h3>
            </div>
            <div className="space-y-4">
              {checklist.map((item, index) => (
                <label key={index} className="flex items-center gap-3 p-4 rounded-xl bg-background/50 border border-border/50 cursor-pointer hover:border-primary/30 transition-colors">
                  <div className="w-6 h-6 rounded border-2 border-primary/50 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100" />
                  </div>
                  <span className="text-foreground">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Final Message */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="text-center p-8 md:p-12 rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 border border-primary/30">
            <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
            <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed mb-4">
              "{t("community.finalMessage")}"
            </p>
            <p className="text-muted-foreground italic">— {t("community.fatherUniverse")}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h3 className="text-3xl font-bold mb-4">{t("community.readyToJoin")}</h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {t("community.ctaDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2 text-lg px-8">
              <Heart className="w-5 h-5" />
              {t("community.joinToday")}
            </Button>
            <Button variant="outline" size="lg" className="gap-2 text-lg px-8">
              <BookOpen className="w-5 h-5" />
              {t("community.readWhitepaper")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;
