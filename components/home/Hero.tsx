import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { CoverImage } from "@/components/ui/CoverImage";
import { IMG } from "@/lib/images";

const HERO_LINKS = [
  { label: "Women", href: "/ready-to-wear?cat=women" },
  { label: "Men", href: "/ready-to-wear?cat=men" },
  { label: "Fabrics", href: "/fabrics" },
  { label: "Explore now", href: "/lookbook" },
];

/** Home hero: the overlay Header sits on top of the campaign image. */
export function Hero() {
  return (
    <section
      aria-label="Simulation de Woodin"
      className="relative h-[680px] overflow-hidden bg-espresso md:h-[960px]"
    >
      <CoverImage
        src={IMG.heroSail}
        alt="Two men and a woman in Woodin prints in front of a white sail shape under a sunset sky"
        pos="50% 30%"
        sizes="100vw"
        priority
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,18,14,0.5)_0%,rgba(26,18,14,0)_24%,rgba(26,18,14,0)_48%,rgba(26,18,14,0.66)_100%)]"
      />
      <div className="absolute inset-x-0 top-0 z-20">
        <Header variant="overlay" />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-[22px] px-4 pb-14 text-center text-white md:px-8 md:pb-24">
        <h1 className="m-0 font-display text-[clamp(32px,9vw,104px)] font-normal uppercase leading-none tracking-[0.18em]">
          Simulation
        </h1>
        <span className="text-xs uppercase tracking-[0.34em] md:text-lg md:tracking-[0.42em]">
          Ready to wear · 2026
        </span>
        <nav
          aria-label="Shop the collection"
          className="mt-2 flex flex-wrap justify-center gap-x-8 gap-y-3 md:mt-[18px] md:gap-x-[52px]"
        >
          {HERO_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="border-b border-white pb-1.5 pt-2.5 text-sm uppercase tracking-[0.12em] text-white no-underline md:text-[15px]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
