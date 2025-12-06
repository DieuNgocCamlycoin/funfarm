import { Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const mantras = [
  "I am the Pure Loving Light of Father Universe.",
  "I am the Will of Father Universe.",
  "I am the Wisdom of Father Universe.",
  "I am Happiness.",
  "I am Love.",
  "I am the Money of the Father.",
  "I sincerely repent, repent, repent.",
  "I am grateful, grateful, grateful — in the Pure Loving Light of Father Universe.",
];

const CommunitySection = () => {
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
            <span className="text-sm font-medium text-primary">Our Community</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Built on{" "}
            <span className="text-gradient-hero">Love & Trust</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            FUN FARM is more than a platform—it's a movement. We believe in transparency, 
            fairness, and the dignity of every person who works the land and sea.
          </p>
        </div>

        {/* Divine Mantras */}
        <div className="bg-card rounded-3xl border border-border p-8 md:p-12 mb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="font-display font-semibold text-accent">8 Divine Mantras</span>
            </div>
            <p className="text-muted-foreground">
              The spiritual foundation of our community
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {mantras.map((mantra, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="flex-shrink-0 w-8 h-8 gradient-earth rounded-full flex items-center justify-center font-display font-bold text-sm text-primary-foreground">
                  {index + 1}
                </span>
                <p className="text-foreground/80 italic leading-relaxed pt-1">
                  "{mantra}"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h3 className="font-display text-3xl md:text-4xl font-bold mb-6 text-foreground">
            Ready to Join the Revolution?
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Be part of a community that values truth, rewards contribution, and celebrates the people who feed the world.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl">
              Join FUN FARM Today
            </Button>
            <Button variant="glass" size="xl">
              Read Whitepaper
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;
