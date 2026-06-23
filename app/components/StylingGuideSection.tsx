import Link from "next/link";
import Image from "next/image";
import { STYLING_LOOKS } from "@/app/lib/stylingGuide";

// Homepage "Styling Guide" — a continuously auto-scrolling lookbook (marquee).
// Each look is an editorial photo with its pieces linked to their product pages.
// Scroll pauses on hover so the links stay tappable. Pure CSS, so this stays a
// server component. Content lives in app/lib/stylingGuide.ts (add more looks there).
export default function StylingGuideSection() {
 if (STYLING_LOOKS.length === 0) return null;

 // Render the looks twice so translateX(-50%) loops seamlessly. Duration scales
 // with the number of looks so the scroll speed stays constant as looks are added.
 const loop = [...STYLING_LOOKS, ...STYLING_LOOKS];
 const durationSec = Math.max(STYLING_LOOKS.length * 7, 40);

 return (
 <section data-section="styling-guide" className="bg-[#FFFDF8] py-16 sm:py-24 overflow-hidden">
 <div className="max-w-7xl mx-auto">
 <div className="px-6 mb-8 sm:mb-12">
 <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-1 font-sans">Shop the look</p>
 <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#5D0F17]">Styling Guide</h2>
 </div>
 </div>

 <div className="relative w-full overflow-hidden">
 <div className="styling-marquee flex gap-5 w-max pl-6" style={{ animationDuration: `${durationSec}s` }}>
 {loop.map((look, i) => (
 <div key={i} className="shrink-0 w-[260px] sm:w-[300px]">
 <div className="relative w-full h-[360px] sm:h-[420px] overflow-hidden bg-[#5D0F17]/[0.04]">
 <Image
 src={look.image}
 alt={`Styled look ${(i % STYLING_LOOKS.length) + 1}`}
 fill
 sizes="(min-width: 640px) 300px, 260px"
 className="object-cover"
 loading="lazy"
 />
 </div>
 <div className="mt-4">
 <p className="text-[10px] uppercase tracking-[0.2em] text-[#5D0F17]/45 mb-2 font-sans">Shop the look</p>
 <div className="flex flex-wrap gap-x-4 gap-y-1.5">
 {look.items.map((it) => (
 <Link
 key={it.url + it.label}
 href={it.url}
 className="text-[14px] font-serif text-[#5D0F17] underline decoration-[#5D0F17]/30 underline-offset-4 hover:decoration-[#5D0F17] transition-colors"
 >
 {it.label}
 </Link>
 ))}
 </div>
 {look.caption && <p className="mt-2 text-[13px] text-[#5D0F17]/55 font-serif">{look.caption}</p>}
 </div>
 </div>
 ))}
 </div>
 </div>

 <style>{`
 @keyframes stylingMarquee {
 from { transform: translateX(0); }
 to { transform: translateX(-50%); }
 }
 .styling-marquee {
 animation-name: stylingMarquee;
 animation-timing-function: linear;
 animation-iteration-count: infinite;
 will-change: transform;
 }
 .styling-marquee:hover { animation-play-state: paused; }
 @media (prefers-reduced-motion: reduce) {
 .styling-marquee { animation: none; }
 }
 `}</style>
 </section>
 );
}
