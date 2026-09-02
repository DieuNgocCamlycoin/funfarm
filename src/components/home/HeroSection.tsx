import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20 pb-10">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,247,225,0.9),_rgba(255,255,255,0.82)_42%,_rgba(255,255,255,0.96)_100%)]" />
        <div className="absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-[#ffe7a8]/30 blur-3xl" />
        <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(rgba(212,175,55,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] max-w-6xl mx-auto">
          <div className="text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.45)] bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#7a5a16] shadow-[0_8px_24px_rgba(184,134,11,0.08)] backdrop-blur-sm mb-8">
              <Sparkles className="h-3.5 w-3.5 text-[#b8860b]" />
              Money.Fun.Rich · 5D LIGHT ECONOMY
            </div>

            <h1 className="mb-5 text-5xl font-black leading-[0.96] md:text-6xl xl:text-7xl">
              <span className="metallic-text block">FUN Money</span>
              <span className="mt-3 block text-[#2B2418]">Tiền của Thời Đại Hoàng Kim.</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-[#51493D] md:text-xl">
              Một hệ thống giá trị mới, nơi những đóng góp tích cực có thể được ghi nhận, trao tặng và sử dụng xuyên suốt FUN Ecosystem.
            </p>

            <p className="mt-4 text-base font-medium text-[#7A5A16] uppercase tracking-[0.16em]">
              Free to Join. Free to Use. Earn Together.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button variant="gold" size="xl" className="group h-14 px-8 text-base font-bold tracking-wide text-[#2B2418]">
                Bắt đầu nhận FUN Money
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="outline" size="xl" className="h-14 px-8 text-base font-semibold">
                Khám phá cách hoạt động
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              {['Minh bạch', 'Dễ tham gia', 'Cộng đồng toàn cầu', 'Tôn trọng tự do'].map((item) => (
                <div key={item} className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.28)] bg-white/75 px-3.5 py-2 text-sm text-[#3B352B] shadow-[0_8px_20px_rgba(184,134,11,0.06)] backdrop-blur-sm">
                  <CheckCircle2 className="h-4 w-4 text-[#b8860b]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center py-6">
            <div className="absolute h-[28rem] w-[28rem] rounded-full border border-[rgba(212,175,55,0.25)]" />
            <div className="absolute h-[21rem] w-[21rem] rounded-full border border-[rgba(212,175,55,0.18)]" />
            <div className="hero-sun animate-[spin_30s_linear_infinite]" />
            <div className="absolute left-0 top-12 h-3 w-3 rounded-full bg-[#d4af37] shadow-[0_0_16px_rgba(212,175,55,0.8)]" />
            <div className="absolute right-8 top-16 h-2.5 w-2.5 rounded-full bg-[#ffdf8a] shadow-[0_0_16px_rgba(255,223,138,0.8)]" />
            <div className="absolute bottom-12 left-8 h-2.5 w-2.5 rounded-full bg-[#d4af37] shadow-[0_0_16px_rgba(212,175,55,0.8)]" />
            <div className="absolute bottom-0 right-10 h-2 w-2 rounded-full bg-[#fff1bf] shadow-[0_0_16px_rgba(255,241,191,0.8)]" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
