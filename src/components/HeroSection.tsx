import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, Wallet } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-0 left-0 w-full h-full">
          {/* Gradient Orbs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-secondary/15 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-float" />
        </div>
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Web3 Agriculture Revolution</span>
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-gradient-hero">FUN FARM</span>
            <span className="block text-foreground">Web3</span>
          </h1>

          {/* Slogan */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 font-display animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Farmers Rich, Eaters Happy
          </p>
          <p className="text-lg text-muted-foreground/80 mb-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Farm to Table, Fair & Fast. <span className="text-accent font-semibold">Free-Fee & Earn.</span>
          </p>

          {/* Description */}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '0.4s' }}>
            The first Web3 social marketplace connecting farmers directly to consumers. 
            Transparent blockchain tracking, AI-powered matching, and rewards for everyone.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <Button variant="hero" size="xl" className="group">
              Start Earning Today
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="xl">
              Explore Marketplace
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-xl mx-auto animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-xl">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <p className="font-display font-bold text-2xl text-foreground">10K+</p>
              <p className="text-sm text-muted-foreground">Farmers</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-secondary/10 rounded-xl">
                <Wallet className="w-6 h-6 text-secondary" />
              </div>
              <p className="font-display font-bold text-2xl text-foreground">$2M+</p>
              <p className="text-sm text-muted-foreground">Earned</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-accent/10 rounded-xl">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <p className="font-display font-bold text-2xl text-foreground">50K+</p>
              <p className="text-sm text-muted-foreground">Products</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
