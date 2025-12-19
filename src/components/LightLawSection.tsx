// 🌱 Divine Mantra: "Ánh Sáng thu hút Ánh Sáng"
import { useTranslation } from "react-i18next";
import { Sparkles, Heart, Sun, Users, Shield, CheckCircle, Star, Zap, BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LightLawSectionProps {
  variant?: 'full' | 'compact';
  className?: string;
}

const LightLawSection = ({ variant = 'full', className = '' }: LightLawSectionProps) => {
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

  if (variant === 'compact') {
    return (
      <ScrollArea className={`h-[400px] ${className}`}>
        <div className="space-y-6 pr-4">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">{t("community.ecosystemBadge")}</span>
            </div>
            <h3 className="text-xl font-bold mb-2">{t("community.usersTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("community.usersSubtitle")}</p>
          </div>

          {/* Who Are FUN Users */}
          <div className="p-4 rounded-xl bg-card/50 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-primary" />
              <h4 className="font-bold text-sm">{t("community.whoAreThey")}</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t("community.usersDescription")}</p>
            <div className="grid grid-cols-2 gap-2">
              {userValues.map((value, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-background/50 text-xs">
                  <value.icon className="w-3 h-3 text-primary flex-shrink-0" />
                  <span>{value.text}</span>
                </div>
              ))}
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
                  <div className="w-4 h-4 rounded border border-primary/50 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-primary" />
                  </div>
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
    );
  }

  // Full variant - used in Welcome page
  return (
    <div className={className}>
      {/* ... full content same as CommunitySection */}
    </div>
  );
};

export default LightLawSection;
