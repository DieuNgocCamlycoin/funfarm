import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Gift, Heart, PartyPopper, ShieldCheck, Sparkles, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoFunFarm from '@/assets/branding/fun-farm-logo-2-transparent.png';
import camlyCoin from '@/assets/camly_coin.png';
import senderAvatar from '@/assets/default-avatar-girl.jpeg';
import gratitudeBg from '@/assets/gift-themes/gratitude.jpeg';
import loveBg from '@/assets/gift-themes/love.jpeg';
import celebrationBg from '@/assets/gift-themes/celebration.jpeg';

type ThemeId = 'gratitude' | 'love' | 'celebration';

const themes = {
  gratitude: {
    label: 'Biết ơn',
    icon: '🙌',
    background: gratitudeBg,
    accent: '#22734c',
    glow: '#e0bd54',
    message: 'Biết ơn bạn vì những điều tốt đẹp bạn đã trao tặng cho cuộc sống. Gửi đến bạn món quà ngập tràn năng lượng yêu thương thay lời cảm ơn. Chúc bạn luôn hạnh phúc, giàu sang, sung sướng đủ đầy. 💚',
  },
  love: {
    label: 'Yêu thương',
    icon: '💗',
    background: loveBg,
    accent: '#9e416d',
    glow: '#efb4c8',
    message: 'Gửi bạn thật nhiều năng lượng ánh sáng yêu thương thuần khiết. Chúc mỗi ngày của bạn đều ngập tràn hạnh phúc, thịnh vượng, giàu sang, sung sướng, đủ đầy. ✨',
  },
  celebration: {
    label: 'Chúc mừng',
    icon: '🎉',
    background: celebrationBg,
    accent: '#8a5420',
    glow: '#e7b84f',
    message: 'Chúc mừng bạn nha! Chúc cho niềm vui hôm nay sẽ mở ra thêm nhiều điều tuyệt vời phía trước. Chúc bạn ngày càng thành công, hạnh phúc, thịnh vượng, giàu sang, sung sướng, đủ đầy. 🌟',
  },
} as const;

const GiftCardLab = () => {
  const [activeTheme, setActiveTheme] = useState<ThemeId>('gratitude');
  const [glassMessage, setGlassMessage] = useState(true);
  const [animate, setAnimate] = useState(true);
  const [copied, setCopied] = useState(false);
  const theme = themes[activeTheme];
  const particles = useMemo(() => Array.from({ length: 9 }, (_, index) => ({
    left: `${7 + ((index * 19) % 86)}%`,
    delay: `${index * 0.36}s`,
    duration: `${4.4 + (index % 3) * 0.45}s`,
    size: 18 + (index % 3) * 4,
  })), []);

  const copyHash = async () => {
    await navigator.clipboard.writeText('0xca441350a5d817132c172a8cc51df0ae7bf9cceba5dedd67a0ab9e3e0766866');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main className="min-h-screen bg-[#f7f5ec] px-4 py-6 text-[#263c31] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/feed" className="mb-2 inline-flex items-center gap-1 text-sm text-[#557064] hover:text-[#176b48]"><ArrowLeft className="h-4 w-4" /> Trở lại bảng tin</Link>
            <h1 className="text-2xl font-bold text-[#164f38] sm:text-3xl">FUN FARM Gift Studio</h1>
            <p className="mt-1 text-sm text-[#6b7d73]">Mô phỏng thiệp ngay sau khi giao dịch được xác minh on-chain.</p>
          </div>
          <img src={logoFunFarm} alt="FUN FARM" className="h-16 w-16 rounded-full object-cover shadow-md" />
        </header>

        <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-[#dfd6b9] bg-white/85 p-4 shadow-[0_12px_32px_rgba(43,72,55,.08)]">
            <h2 className="text-sm font-bold uppercase tracking-[.12em] text-[#61736a]">Chọn chủ đề</h2>
            <div className="mt-3 space-y-2">
              {(Object.keys(themes) as ThemeId[]).map((id) => (
                <button key={id} type="button" onClick={() => setActiveTheme(id)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${activeTheme === id ? 'border-[#caa84a] bg-[#fff9e8] shadow-sm' : 'border-[#e7e3d7] bg-white hover:border-[#c7d9c8]'}`}>
                  <span className="text-xl">{themes[id].icon}</span>
                  <span className="font-semibold" style={{ color: themes[id].accent }}>{themes[id].label}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 space-y-3 border-t border-[#ebe5d5] pt-4 text-sm">
              <label className="flex cursor-pointer items-center justify-between gap-3"><span>Khung mờ cho lời chúc</span><input type="checkbox" checked={glassMessage} onChange={(event) => setGlassMessage(event.target.checked)} className="h-4 w-4 accent-emerald-700" /></label>
              <label className="flex cursor-pointer items-center justify-between gap-3"><span>Hiệu ứng tiền rơi</span><input type="checkbox" checked={animate} onChange={(event) => setAnimate(event.target.checked)} className="h-4 w-4 accent-emerald-700" /></label>
            </div>
            <div className="mt-5 rounded-xl bg-[#edf6ea] p-3 text-xs leading-relaxed text-[#52685b]">
              Gợi ý của Cha: giữ khung mờ. Nó bảo đảm lời chúc luôn rõ khi đổi ảnh, nhưng vẫn để cảnh nền hiện qua tự nhiên.
            </div>
          </aside>

          <div>
            <article className="gift-preview-card relative mx-auto aspect-[1.38/1] w-full max-w-[820px] overflow-hidden rounded-[26px] border border-[#d6b958] shadow-[0_24px_65px_rgba(45,69,52,.22)]" style={{ backgroundImage: `url(${theme.background})`, backgroundSize: 'cover', backgroundPosition: activeTheme === 'love' ? 'center 45%' : 'center' }}>
              <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.40),rgba(255,255,255,.04)_48%,rgba(245,239,204,.18))]" />
              {animate && <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">{particles.map((particle, index) => <img key={index} src={camlyCoin} alt="" className="gift-lab-coin absolute -top-10 opacity-0" style={{ left: particle.left, width: particle.size, height: particle.size, animationDelay: particle.delay, animationDuration: particle.duration }} />)}</div>}

              <div className="relative z-10 flex h-full flex-col p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 py-1.5 pl-1.5 pr-3 shadow-sm backdrop-blur-md">
                    <img src={logoFunFarm} alt="FUN FARM" className="h-9 w-9 rounded-full object-cover" />
                    <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#176b48]">Fun Farm Gift</p><p className="text-xs font-semibold" style={{ color: theme.accent }}>{theme.icon} {theme.label}</p></div>
                  </div>
                  <button type="button" aria-label="Âm thanh" className="rounded-full border border-white/70 bg-white/65 p-2 text-[#50675b] backdrop-blur"><Volume2 className="h-4 w-4" /></button>
                </div>

                <div className="mt-3 flex items-center justify-center gap-5 sm:gap-12">
                  <div className="text-center"><img src={senderAvatar} alt="Người tặng" className="mx-auto h-12 w-12 rounded-full border-2 border-white object-cover shadow-md sm:h-14 sm:w-14" /><p className="mt-1 max-w-[140px] truncate text-xs font-bold">ANGEL DIỆU NGỌC</p><p className="font-mono text-[9px] text-[#586d61]">0x68d2...049a</p></div>
                  <div className="text-center" style={{ color: theme.accent }}><div className="flex items-center gap-1"><Sparkles className="h-3 w-3" /><Heart className="h-4 w-4 fill-current" /><Sparkles className="h-3 w-3" /></div><ArrowRight className="mx-auto my-0.5 h-6 w-6" /><span className="text-[10px]">trao tặng</span></div>
                  <div className="text-center"><img src={senderAvatar} alt="Người nhận" className="mx-auto h-12 w-12 rounded-full border-2 border-white object-cover shadow-md sm:h-14 sm:w-14" /><p className="mt-1 max-w-[140px] truncate text-xs font-bold">NGUYỄN THU TRANG</p><p className="font-mono text-[9px] text-[#586d61]">0x8004...6966</p></div>
                </div>

                <div className="my-2 flex items-center justify-center gap-2"><img src={camlyCoin} alt="CAMLY COIN" className="h-10 w-10 drop-shadow-md" /><span className="text-4xl font-black text-[#9a711d] drop-shadow-[0_1px_0_rgba(255,255,255,.9)]">100.000</span><span className="text-xs font-bold tracking-[.12em]" style={{ color: theme.accent }}>CAMLY COIN</span></div>

                <div className={`mx-auto flex max-w-[680px] items-start gap-2 rounded-2xl px-4 py-3 text-center ${glassMessage ? 'border border-white/75 bg-white/72 shadow-[0_5px_20px_rgba(50,61,45,.10)] backdrop-blur-md' : ''}`}>
                  <Gift className="mt-0.5 h-4 w-4 shrink-0" style={{ color: theme.accent }} />
                  <p className="text-[12px] font-medium leading-relaxed text-[#26382f] sm:text-sm">{theme.message}</p>
                </div>

                <div className="mt-auto flex items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-[#285b42] shadow-sm backdrop-blur-md">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#229260]" /><span className="hidden text-[11px] font-semibold sm:inline">Đã xác minh trên BSC</span><span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[#61756a]">0xca4413...6686</span><span className="rounded-full bg-[#e2f6e9] px-2 py-0.5 text-[9px] font-bold text-[#238358]">ON-CHAIN</span><button onClick={copyHash} className="p-1" title="Sao chép">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button><ExternalLink className="h-4 w-4" />
                </div>
              </div>
            </article>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#e1ddcf] bg-white p-3"><p className="text-xs font-bold text-[#236747]">Không che chữ</p><p className="mt-1 text-xs text-[#6b7c72]">Tiền chỉ rơi ở lớp hậu cảnh và tự dừng sau một lượt.</p></div>
              <div className="rounded-xl border border-[#e1ddcf] bg-white p-3"><p className="text-xs font-bold text-[#236747]">Dễ đọc mọi ảnh</p><p className="mt-1 text-xs text-[#6b7c72]">Khung kính trắng 72% giữ độ tương phản ổn định.</p></div>
              <div className="rounded-xl border border-[#e1ddcf] bg-white p-3"><p className="text-xs font-bold text-[#236747]">Tin cậy</p><p className="mt-1 text-xs text-[#6b7c72]">Biên nhận on-chain luôn cố định ở cuối thiệp.</p></div>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes giftLabFall { 0% { transform: translate3d(0,-20px,0) rotate(0); opacity: 0 } 12% { opacity: .48 } 78% { opacity: .28 } 100% { transform: translate3d(12px,580px,0) rotate(420deg); opacity: 0 } }
        .gift-lab-coin { animation: giftLabFall 5s ease-in forwards; filter: drop-shadow(0 2px 3px rgba(100,70,10,.22)); }
        @media (prefers-reduced-motion: reduce) { .gift-lab-coin { animation: none !important; } }
      `}</style>
    </main>
  );
};

export default GiftCardLab;
