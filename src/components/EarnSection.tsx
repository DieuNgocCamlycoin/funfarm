import { Gift, Rocket, TrendingUp, Coins, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const earnMethods = [
  {
    icon: Gift,
    title: "Join & Earn",
    description: "Create your profile, verify your identity, and receive a welcome bonus in CAMLY tokens.",
    reward: "Welcome Bonus",
    color: "primary",
  },
  {
    icon: Rocket,
    title: "Use & Earn",
    description: "Every valuable action earns rewards: post products, share stories, write reviews, refer friends.",
    reward: "Per Action",
    color: "secondary",
  },
  {
    icon: TrendingUp,
    title: "Grow & Earn",
    description: "Improve quality, build reputation, increase sales. The more you grow, the more you earn.",
    reward: "Bonus Multiplier",
    color: "accent",
  },
];

const EarnSection = () => {
  return (
    <section id="earn" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-2 mb-6">
            <Coins className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Token Economy</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Free-Fee Platform,{" "}
            <span className="text-gradient-earth">Earn Rewards</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            No fees taken from your sales. We reward you for contributing value to the ecosystem with CAMLY tokens.
          </p>
        </div>

        {/* Earn Methods */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {earnMethods.map((method, index) => (
            <div
              key={method.title}
              className="relative group"
            >
              <div className="bg-card rounded-3xl p-8 border border-border h-full transition-all duration-300 hover:border-accent/30 hover:shadow-card">
                {/* Step Number */}
                <div className="absolute -top-4 left-8">
                  <span className="gradient-earth text-primary-foreground font-display font-bold text-sm px-4 py-1 rounded-full">
                    Step {index + 1}
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
                  {method.title}
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {method.description}
                </p>

                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-accent" />
                  <span className="font-semibold text-accent">{method.reward}</span>
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
                <span className="text-sm text-muted-foreground">Token</span>
              </div>
              <h3 className="font-display font-bold text-3xl md:text-4xl mb-4 text-foreground">
                The Currency of{" "}
                <span className="text-gradient-earth">Love & Value</span>
              </h3>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                CAMLY Coin powers the FUN FARM ecosystem. Earn it, spend it, stake it. 
                Your reputation becomes your wealth.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="accent" size="lg" className="group">
                  Learn About CAMLY
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
            <div className="relative min-h-[250px] bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
              <div className="w-32 h-32 gradient-earth rounded-full flex items-center justify-center shadow-lg animate-pulse-glow">
                <span className="font-display font-bold text-3xl text-primary-foreground">C</span>
              </div>
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
