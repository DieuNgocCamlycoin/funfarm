import kingdomLogo from "@/assets/ecosystem/fun-kingdom-transparent.png";

const FunKingdomCard = () => (
  <section className="ff-luxury-panel ff-kingdom-card overflow-hidden px-4 py-3">
    <div className="flex flex-col items-center text-center">
      <div className="ff-kingdom-emblem">
        <img src={kingdomLogo} alt="FUN Kingdom" className="h-full w-full object-contain" />
      </div>
      <div className="mt-1">
        <p className="ff-hologram-text whitespace-nowrap text-xl font-black tracking-[0.08em]">FUN KINGDOM</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-900/70">Kingdom of Light 5D</p>
      </div>
    </div>
  </section>
);

export default FunKingdomCard;
