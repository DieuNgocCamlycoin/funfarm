import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ExternalLink, Sparkles, BookOpen, Gift, Users, Zap, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

const platforms: Platform[] = [
  { name: "FUN Profile", logo: funProfileLogo, link: "https://fun.rich/" },
  { name: "FUN Play", logo: funPlayLogo, link: "https://play.fun.rich/" },
  { name: "FUN Planet", logo: funPlanetLogo, link: "https://planet.fun.rich/" },
  { name: "FUN Charity", logo: funCharityLogo, link: "https://angelaivan.fun.rich/" },
  { name: "FUN Wallet", logo: funWalletLogo, link: "https://funwallet-rich.lovable.app/dashboard" },
  { name: "Angel AI", logo: angelAiLogo, link: "https://angel-light-nexus.lovable.app/" },
  { name: "Green Earth", logo: greenEarthLogo, link: null },
  { name: "Camly Coin", logo: camlyCoinLogo, link: "https://camly.co/" },
  { name: "FUN Money", logo: funMoneyLogo, link: null },
  { name: "FUN Life", logo: funLifeLogo, link: null },
];

const aboutItems = [
  { icon: Sparkles, label: "Tính năng", href: "/welcome#features" },
  { icon: Gift, label: "Nhận thưởng", href: "/welcome#earn" },
  { icon: Users, label: "Cộng đồng", href: "/welcome#community" },
  { icon: Zap, label: "Luật Ánh Sáng", href: "/love-rules" },
  { icon: FileText, label: "Whitepaper", href: "https://docs.google.com/document/d/your-whitepaper-id", external: true },
];

const EcosystemSidebar = () => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

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
          border: "4px solid rgba(255, 255, 255, 0.9)",
          borderRadius: "20px",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(255,255,255,0.3), 0 0 15px rgba(255,255,255,0.3), 0 8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <h2
          className="text-lg font-bold flex items-center gap-2 mb-4"
          style={{
            color: "#ffd700",
            textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 10px rgba(255,215,0,0.7)",
          }}
        >
          🌱 FUN ECOSYSTEM
        </h2>

        {/* Law of Light Button */}
        <Link
          to="/love-rules"
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl mb-4 transition-all hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 165, 0, 0.3))",
            border: "1.5px solid rgba(255, 215, 0, 0.6)",
            boxShadow: "0 0 15px rgba(255, 215, 0, 0.3)",
          }}
        >
          <Zap className="w-5 h-5 text-yellow-400" />
          <span
            className="font-semibold"
            style={{
              color: "#ffd700",
              textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            Law of Light
          </span>
        </Link>

        {/* About FUN FARM Accordion */}
        <div className="mb-3">
          <button
            onClick={() => setIsAboutOpen(!isAboutOpen)}
            className="flex items-center gap-3 w-full p-3 rounded-xl transition-all hover:bg-emerald-500/20"
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
            }}
          >
            <img
              src={funFarmLogo}
              alt="FUN FARM"
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/50"
            />
            <span className="flex-1 text-left font-medium text-white">About FUN FARM</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-emerald-400 transition-transform duration-200",
                isAboutOpen && "rotate-180"
              )}
            />
          </button>

          {isAboutOpen && (
            <div className="mt-2 ml-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
              {aboutItems.map((item) => (
                item.external ? (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-emerald-500/20 transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-emerald-400" />
                    {item.label}
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-emerald-500/20 transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-emerald-400" />
                    {item.label}
                  </Link>
                )
              ))}
            </div>
          )}
        </div>

        {/* Platforms List */}
        <div className="space-y-1">
          {platforms.map((platform) => {
            const content = (
              <div
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200",
                  platform.link
                    ? "hover:bg-emerald-500/20 hover:scale-[1.02] cursor-pointer"
                    : "opacity-60 cursor-default"
                )}
              >
                <img
                  src={platform.logo}
                  alt={platform.name}
                  className="w-9 h-9 rounded-full object-cover border border-white/20"
                />
                <span className="flex-1 text-sm font-medium text-white/90">{platform.name}</span>
                {platform.link && (
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400/70" />
                )}
              </div>
            );

            if (platform.link) {
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
