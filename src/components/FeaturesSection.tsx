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

const features = [
  {
    icon: Store,
    title: "Direct Marketplace",
    description: "Connect farmers directly to consumers. No middlemen, fair prices for everyone.",
    color: "primary",
  },
  {
    icon: Users,
    title: "Social Network",
    description: "Build your farmer brand, share stories, go live from your farm, and grow your community.",
    color: "secondary",
  },
  {
    icon: Shield,
    title: "Blockchain Transparency",
    description: "Every product tracked from farm to table. Immutable reviews and verified origins.",
    color: "accent",
  },
  {
    icon: Bot,
    title: "Angel AI Assistant",
    description: "Smart matching, demand forecasting, and marketing help powered by divine intelligence.",
    color: "primary",
  },
  {
    icon: Star,
    title: "Review & Reward",
    description: "Honest reviews build reputation. Every valuable contribution earns CAMLY tokens.",
    color: "secondary",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Sell locally or globally. Fresh products delivered faster through optimized logistics.",
    color: "accent",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-muted/30" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-4 py-2 mb-6">
            <Leaf className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-secondary">Platform Features</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Everything You Need to{" "}
            <span className="text-gradient-hero">Thrive</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            A complete ecosystem for farmers, consumers, restaurants, and distributors to connect, trade, and prosper together.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
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
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
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
                Go Live From Your Farm
              </h3>
              <p className="text-muted-foreground text-lg">
                Stream harvests, share your daily farming life, and build authentic connections with your customers worldwide.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
