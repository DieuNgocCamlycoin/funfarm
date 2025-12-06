import { UserPlus, Package, Truck, Star, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Create Your Profile",
    description: "Join as a farmer, consumer, restaurant, or distributor. Verify your identity on blockchain.",
    details: ["Blockchain-verified identity", "Build your reputation from day one", "Earn welcome bonus"],
  },
  {
    icon: Package,
    title: "List or Browse Products",
    description: "Farmers post fresh products. Buyers discover local and global farm-fresh goods.",
    details: ["Photo & video proof", "Track farming journey", "Real-time availability"],
  },
  {
    icon: Truck,
    title: "Direct Connection",
    description: "Angel AI matches supply with demand. Optimal logistics for fresher delivery.",
    details: ["AI-powered matching", "Shorter delivery times", "Fair pricing guaranteed"],
  },
  {
    icon: Star,
    title: "Review & Reward",
    description: "Honest reviews build trust. Every contribution earns CAMLY tokens.",
    details: ["Immutable reviews on chain", "Earn for honest feedback", "Reputation = wealth"],
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 relative bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Simple Process</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-foreground">
            How{" "}
            <span className="text-gradient-hero">FUN FARM</span>{" "}
            Works
          </h2>
          <p className="text-lg text-muted-foreground">
            From farm to table in just a few steps. Transparent, fair, and rewarding for everyone.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
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
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {step.description}
                  </p>

                  <ul className="space-y-2">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {detail}
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
