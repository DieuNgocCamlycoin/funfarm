import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Zap, BookOpen, FileText, ChevronDown, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Platform logos
import funFarmLogo from "@/assets/logo_fun_farm_web3.png";
import funProfileLogo from "@/assets/platforms/fun-profile.png";
import funPlayLogo from "@/assets/platforms/fun-play.png";
import funPlanetLogo from "@/assets/platforms/fun-planet.png";
import funCharityLogo from "@/assets/platforms/fun-charity.png";
import funWalletLogo from "@/assets/platforms/fun-wallet.png";
import angelAiLogo from "@/assets/platforms/angel-ai.png";
import greenEarthLogo from "@/assets/platforms/green-earth.png";
import camlyCoinLogo from "@/assets/camly_coin.png";
import funMoneyLogo from "@/assets/platforms/fun-money.png";
import funLifeLogo from "@/assets/platforms/fun-life.png";

interface Platform {
  name: string;
  logo: string;
  link: string | null;
  internal?: boolean; // For internal routes (react-router)
}

const platforms: Platform[] = [
  { name: "FUN Profile", logo: funProfileLogo, link: "https://fun.rich/" },
  { name: "FUN Play", logo: funPlayLogo, link: "https://play.fun.rich/" },
  { name: "FUN Planet", logo: funPlanetLogo, link: "https://planet.fun.rich/" },
  { name: "FUN Charity", logo: funCharityLogo, link: "https://angelaivan.fun.rich/" },
  { name: "FUN Wallet", logo: funWalletLogo, link: "https://funwallet-rich.lovable.app/dashboard" },
  { name: "Angel AI", logo: angelAiLogo, link: "/angel-ai", internal: true },
  { name: "Green Earth", logo: greenEarthLogo, link: "https://greenearth-fun.lovable.app" },
  { name: "Camly Coin", logo: camlyCoinLogo, link: "https://camly.co/" },
  { name: "FUN Money", logo: funMoneyLogo, link: null },
  { name: "FUN Life", logo: funLifeLogo, link: null },
];

const EcosystemSidebar = () => {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div
      className="sticky top-24 space-y-4 overflow-y-auto scrollbar-thin pr-2"
      style={{
        maxHeight: "calc(100vh - 120px)",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(16, 185, 129, 0.5) transparent",
      }}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{
          background: "linear-gradient(135deg, rgba(120,200,255,0.12) 0%, rgba(255,255,255,0.08) 30%, rgba(180,220,255,0.15) 70%, rgba(255,255,255,0.1) 100%)",
          backdropFilter: "saturate(120%)",
          border: "3px solid #fbbf24",
          borderRadius: "20px",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(200,150,0,0.4), 0 0 20px rgba(251,191,36,0.4), 0 8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <h2
          className="text-xl font-bold flex items-center gap-2 mb-4"
          style={{
            color: "#ffd700",
            textShadow: "0 2px 4px rgba(0,0,0,0.9), 0 0 15px rgba(255,215,0,0.7)",
          }}
        >
          🌱 FUN ECOSYSTEM
        </h2>

        {/* Law of Light Button */}
        <Link
          to="/law-of-light"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl mb-3 transition-all hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, rgba(255, 215, 0, 0.4), rgba(255, 165, 0, 0.4))",
            border: "2px solid #ffd700",
            boxShadow: "0 0 20px rgba(255, 215, 0, 0.5), inset 0 2px 4px rgba(255,255,255,0.4)",
          }}
        >
          <Zap className="w-6 h-6 text-yellow-400" style={{ filter: "drop-shadow(0 0 8px rgba(255,215,0,0.8))" }} />
          <span
            className="text-base font-bold"
            style={{
              color: "#ffd700",
              textShadow: "0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(255,215,0,0.5)",
            }}
          >
            Law of Light
          </span>
        </Link>

        {/* Marketplace Button */}
        <Link
          to="/marketplace"
          onClick={() => window.scrollTo(0, 0)}
          className="stat-row-shine flex items-center gap-3 w-full px-4 py-3 rounded-xl mb-3 transition-all hover:scale-[1.02] hover:brightness-110"
          style={{
            background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 30%, #16a34a 60%, #15803d 100%)',
            border: '2px solid #fbbf24',
            boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.5), inset 0 -4px 12px rgba(0,0,0,0.2), 0 0 10px rgba(251,191,36,0.5), 0 4px 8px rgba(0,0,0,0.3)',
            borderRadius: '16px',
          }}
        >
          <ShoppingBag className="w-6 h-6 text-amber-300" style={{ filter: "drop-shadow(0 0 8px rgba(255,215,0,0.8))" }} />
          <span
            className="text-base font-bold"
            style={{
              color: "#ffd700",
              textShadow: "0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(255,215,0,0.5)",
            }}
          >
            🛒 Chợ Nông Sản
          </span>
        </Link>

        {/* About FUN FARM Dropdown */}
        <Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
          <CollapsibleTrigger asChild>
            <button
              className="stat-row-shine flex items-center gap-3 w-full p-3 rounded-xl mb-3 hover:brightness-110 transition-all"
              style={{
                background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 30%, #16a34a 60%, #15803d 100%)',
                border: '2px solid #fbbf24',
                boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.5), inset 0 -4px 12px rgba(0,0,0,0.2), 0 0 10px rgba(251,191,36,0.5), 0 4px 8px rgba(0,0,0,0.3)',
                borderRadius: '16px',
              }}
            >
              <div 
                className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden relative"
                style={{
                  outline: "2px solid #fbbf24",
                  outlineOffset: "0px",
                  boxShadow: "0 0 8px rgba(251,191,36,0.4)"
                }}
              >
                <img
                  src={funFarmLogo}
                  alt="FUN FARM"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <span 
                className="flex-1 text-left font-bold"
                style={{
                  color: "#ffd700",
                  textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(255,215,0,0.5)"
                }}
              >
                ABOUT FUN FARM
              </span>
              <ChevronDown 
                className={cn(
                  "w-5 h-5 text-amber-300 transition-transform duration-200",
                  aboutOpen && "rotate-180"
                )} 
                style={{ filter: "drop-shadow(0 0 4px rgba(251,191,36,0.6))" }} 
              />
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="pl-4 space-y-2 mb-3">
            {/* Thông tin chung */}
            <Link
              to="/about-fun-farm"
              onClick={() => window.scrollTo(0, 0)}
              className="stat-row-shine flex items-center gap-3 w-full p-2.5 rounded-xl hover:brightness-110 transition-all"
              style={{
                background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 30%, #16a34a 60%, #15803d 100%)',
                border: '2px solid #fbbf24',
                boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.5), inset 0 -4px 12px rgba(0,0,0,0.2), 0 0 10px rgba(251,191,36,0.5), 0 4px 8px rgba(0,0,0,0.3)',
                borderRadius: '14px',
              }}
            >
              <BookOpen className="w-5 h-5 text-amber-300" style={{ filter: "drop-shadow(0 0 4px rgba(251,191,36,0.6))" }} />
              <span 
                className="flex-1 text-left font-semibold text-sm"
                style={{
                  color: "#ffd700",
                  textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(255,215,0,0.5)"
                }}
              >
                Thông tin chung
              </span>
            </Link>

            {/* Whitepaper */}
            <Link
              to="/whitepaper"
              onClick={() => window.scrollTo(0, 0)}
              className="stat-row-shine flex items-center gap-3 w-full p-2.5 rounded-xl hover:brightness-110 transition-all"
              style={{
                background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 30%, #16a34a 60%, #15803d 100%)',
                border: '2px solid #fbbf24',
                boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.5), inset 0 -4px 12px rgba(0,0,0,0.2), 0 0 10px rgba(251,191,36,0.5), 0 4px 8px rgba(0,0,0,0.3)',
                borderRadius: '14px',
              }}
            >
              <FileText className="w-5 h-5 text-amber-300" style={{ filter: "drop-shadow(0 0 4px rgba(251,191,36,0.6))" }} />
              <span 
                className="flex-1 text-left font-semibold text-sm"
                style={{
                  color: "#ffd700",
                  textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(255,215,0,0.5)"
                }}
              >
                Whitepaper
              </span>
            </Link>
          </CollapsibleContent>
        </Collapsible>

        {/* Platforms List */}
        <div className="space-y-3">
          {platforms.map((platform) => {
            const content = (
              <div
                className={cn(
                  "stat-row-shine flex items-center gap-3 p-2.5 rounded-xl",
                  platform.link
                    ? "hover:brightness-110 cursor-pointer"
                    : "opacity-70 cursor-default"
                )}
                style={{
                  background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 30%, #16a34a 60%, #15803d 100%)',
                  border: '2px solid #fbbf24',
                  boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.5), inset 0 -4px 12px rgba(0,0,0,0.2), 0 0 10px rgba(251,191,36,0.5), 0 4px 8px rgba(0,0,0,0.3)',
                  borderRadius: '16px',
                }}
              >
                <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden">
                  <img
                    src={platform.logo}
                    alt={platform.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span 
                  className="flex-1 text-base font-semibold"
                  style={{
                    color: "#ffd700",
                    textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(255,215,0,0.5)"
                  }}
                >
                  {platform.name}
                </span>
                {platform.link && !platform.internal && (
                  <ExternalLink className="w-4 h-4 text-amber-300" style={{ filter: "drop-shadow(0 0 4px rgba(251,191,36,0.6))" }} />
                )}
              </div>
            );

            if (platform.link) {
              // Internal link - use React Router
              if (platform.internal) {
                return (
                  <Link
                    key={platform.name}
                    to={platform.link}
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    {content}
                  </Link>
                );
              }
              // External link
              return (
                <a
                  key={platform.name}
                  href={platform.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {content}
                </a>
              );
            }

            return <div key={platform.name}>{content}</div>;
          })}
        </div>
      </div>
    </div>
  );
};

export default EcosystemSidebar;
