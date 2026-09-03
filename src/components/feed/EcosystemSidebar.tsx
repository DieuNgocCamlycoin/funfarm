import { CSSProperties, ReactNode, SyntheticEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronDown, FileText, Store, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import funFarmLogo from "@/assets/branding/fun-farm-logo-2-transparent.png";
import funProfileLogo from "@/assets/platforms/fun-profile.png";
import funPlayLogo from "@/assets/platforms/fun-play.png";
import funPlanetLogo from "@/assets/platforms/fun-planet.png";
import funCharityLogo from "@/assets/platforms/fun-charity.png";
import greenEarthLogo from "@/assets/platforms/green-earth.png";
import ecosystemLogo from "@/assets/ecosystem/fun-ecosystem.png";
import plpLogo from "@/assets/ecosystem/plp.png";
import urantiaLogo from "@/assets/ecosystem/urantia.png";
import funMoneyLogo from "@/assets/ecosystem/fun-money.png";
import camlyCoinLogo from "@/assets/ecosystem/camly-coin.png";
import funCosmosLogo from "@/assets/ecosystem/fun-cosmos.png";
import funWalletLogo from "@/assets/ecosystem/fun-wallet.png";
import loveHubLogo from "@/assets/ecosystem/lovehub.png";
import angelAiLogo from "@/assets/ecosystem/angel-ai.png";

interface Platform { name: string; logo: string; link: string; internal?: boolean }

const platforms: Platform[] = [
  { name: "LOVEHUB", logo: loveHubLogo, link: "https://lovehub.fun.rich/" },
  { name: "FUN Profile", logo: funProfileLogo, link: "https://fun.rich/" },
  { name: "FUN Play", logo: funPlayLogo, link: "https://play.fun.rich/" },
  { name: "FUN Planet", logo: funPlanetLogo, link: "https://planet.fun.rich/" },
  { name: "FUN Wallet", logo: funWalletLogo, link: "https://funwallet-rich.lovable.app/dashboard" },
  { name: "FUN Charity", logo: funCharityLogo, link: "https://angelaivan.fun.rich/" },
  { name: "Green Earth", logo: greenEarthLogo, link: "https://greenearth-fun.lovable.app" },
  { name: "FUN FARM", logo: funFarmLogo, link: "/feed", internal: true },
  { name: "FUN COSMOS", logo: funCosmosLogo, link: "https://cosmos.fun.rich/" },
  { name: "URANTIA", logo: urantiaLogo, link: "https://urantia.fun.rich/" },
  { name: "Angel AI", logo: angelAiLogo, link: "/angel-ai", internal: true },
];

const coins = Array.from({ length: 16 }, (_, index) => ({
  name: index % 2 === 0 ? "FUN Money" : "CAMLY Coin",
  logo: index % 2 === 0 ? funMoneyLogo : camlyCoinLogo,
  link: index % 2 === 0 ? "https://money.fun.rich/" : "https://camly.co/",
}));

const orbitPosition = (index: number, count: number, radius: number): CSSProperties => {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return { left: `${50 + radius * Math.cos(angle)}%`, top: `${50 + radius * Math.sin(angle)}%` };
};

const NormalizedLogo = ({ src, alt }: { src: string; alt: string }) => {
  const [scale, setScale] = useState(1);

  const measureVisibleBounds = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        if (data[(y * canvas.width + x) * 4 + 3] > 18) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX < 0 || maxY < 0) return;
    const visibleRatio = Math.max((maxX - minX) / canvas.width, (maxY - minY) / canvas.height);
    setScale(Math.min(1.75, Math.max(.86, .92 / visibleRatio)));
  };

  return <img src={src} alt={alt} onLoad={measureVisibleBounds} style={{ transform: `scale(${scale})` }} />;
};

const OrbitLink = ({ item }: { item: Platform }) => {
  const logo = <span className="ff-orbit-logo"><NormalizedLogo src={item.logo} alt={item.name} /><span className="ff-orbit-tooltip">{item.name}</span></span>;
  return item.internal
    ? <Link className="ff-orbit-hitarea" to={item.link} onClick={() => window.scrollTo(0, 0)} aria-label={item.name}>{logo}</Link>
    : <a className="ff-orbit-hitarea" href={item.link} target="_blank" rel="noopener noreferrer" aria-label={item.name}>{logo}</a>;
};

const GreenButton = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <span className={cn("ff-luxury-green-button flex w-full items-center gap-3 rounded-xl px-4 py-3", className)}>{children}</span>
);

const EcosystemSidebar = () => {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("is_product_post", true).eq("product_status", "active")
      .then(({ count }) => setProductCount(count || 0));
  }, []);

  return (
    <div className="ff-sidebar-scroll sticky top-[65px] max-h-[calc(100dvh-65px)] overflow-y-auto overscroll-contain px-1 pb-4 pt-1">
      <section className="ff-luxury-panel ff-ecosystem-map p-3">
        <div className="mb-2 flex items-center justify-center gap-2">
          <img src={ecosystemLogo} alt="FUN Ecosystem" className="ff-hologram-ring h-10 w-10 rounded-full object-cover" />
          <h2 className="ff-hologram-text text-center text-xl font-black tracking-wide">FUN ECOSYSTEM</h2>
        </div>

        <div className="ff-orbit-stage" aria-label="Bản đồ FUN Ecosystem">
          <div className="ff-orbit-layer ff-orbit-platforms">
            {platforms.map((platform, index) => (
              <div key={platform.name} className="ff-orbit-node ff-orbit-face-counter" style={orbitPosition(index, platforms.length, 41.5)}><OrbitLink item={platform} /></div>
            ))}
          </div>
          <div className="ff-orbit-layer ff-orbit-coins">
            {coins.map((coin, index) => (
              <a key={`${coin.name}-${index}`} href={coin.link} target="_blank" rel="noopener noreferrer" className="ff-orbit-node ff-orbit-face-clockwise" style={orbitPosition(index, coins.length, 21.5)} aria-label={coin.name}>
                <span className="ff-orbit-coin"><img src={coin.logo} alt={coin.name} /></span>
              </a>
            ))}
          </div>
          <a href="https://money.fun.rich/" target="_blank" rel="noopener noreferrer" className="ff-orbit-center" aria-label="PureLove Protocol"><img src={plpLogo} alt="PLP - PureLove Protocol" /></a>
        </div>
        <p className="ff-orbit-caption mb-2 text-center text-[11px] font-medium text-emerald-900/70">Chạm vào logo để khám phá hệ sinh thái</p>

        <div className="space-y-2.5">
        <Link to="/marketplace" onClick={() => window.scrollTo(0, 0)} className="ff-marketplace-ecosystem block transition-transform hover:scale-[1.015]">
          <span className="ff-marketplace-metal flex h-[58px] w-full items-center gap-3 rounded-[15px] px-4 py-1.5">
            <span className="ff-marketplace-icon"><Store className="h-5 w-5" /></span>
            <span className="relative z-[2] flex-1"><strong className="ff-metallic-market-text block text-lg">Chợ Nông Sản</strong>{productCount > 0 && <small className="font-medium text-white/95">{productCount} sản phẩm đang bán</small>}</span>
          </span>
        </Link>
        <Link to="/law-of-light" className="ff-luxury-gold-button flex h-[58px] items-center gap-3 rounded-[15px] px-4 py-1.5 transition-transform hover:scale-[1.015]"><Zap className="h-5 w-5" /><span className="font-extrabold">Law of Light</span></Link>
        <Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full transition-transform hover:scale-[1.015]"><GreenButton className="h-[58px] rounded-[15px] py-1.5"><img src={funFarmLogo} alt="FUN FARM" className="h-8 w-8 rounded-full object-cover drop-shadow-md" /><span className="ff-clean-gold-text flex-1 text-left font-extrabold">ABOUT FUN FARM</span><ChevronDown className={cn("h-5 w-5 text-amber-300 transition-transform", aboutOpen && "rotate-180")} /></GreenButton></button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 pl-3">
            <Link to="/about-fun-farm" className="block"><GreenButton className="py-2.5"><BookOpen className="h-5 w-5 text-amber-300" /><span className="ff-clean-gold-text font-bold">Thông tin chung</span></GreenButton></Link>
            <Link to="/whitepaper" className="block"><GreenButton className="py-2.5"><FileText className="h-5 w-5 text-amber-300" /><span className="ff-clean-gold-text font-bold">Whitepaper</span></GreenButton></Link>
          </CollapsibleContent>
        </Collapsible>
        </div>
      </section>
    </div>
  );
};

export default EcosystemSidebar;
