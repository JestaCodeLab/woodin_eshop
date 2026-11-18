import { Header } from "@/components/layout/Header";
import { IMG } from "@/lib/images";
import { shopHref } from "@/lib/links";
import { HeroSlider, type HeroSlide } from "./HeroSlider";

/** Landscape campaign shots only: the banner is full-bleed and these crop cleanly. */
const SLIDES: HeroSlide[] = [
  {
    id: "simulation",
    image: IMG.heroSail,
    alt: "Two men and a woman in Woodin prints in front of a white sail shape under a sunset sky",
    pos: "50% 30%",
    title: "Simulation",
    eyebrow: "Ready to wear · 2026",
    links: [
      { label: "Women", href: shopHref("women") },
      { label: "Men", href: shopHref("men") },
      { label: "Fabrics", href: shopHref("fabrics") },
      { label: "Explore now", href: shopHref() },
    ],
  },
  {
    id: "elegance",
    image: IMG.womenPinkGreen,
    alt: "Two women in a pink print dress and a green print blouse against a golden sky",
    pos: "46% 30%",
    title: "Elegance",
    eyebrow: "Woodin Women",
    links: [
      { label: "Shop women", href: shopHref("women") },
      { label: "Shop all", href: shopHref() },
    ],
  },
  {
    id: "heritage",
    image: IMG.menHeritage,
    alt: "Three men in heritage print shirts against a sky gradient",
    pos: "50% 30%",
    title: "Heritage",
    eyebrow: "Woodin Men",
    links: [
      { label: "Shop men", href: shopHref("men") },
      { label: "Shop all", href: shopHref() },
    ],
  },
  {
    id: "weekend",
    image: IMG.menPatchworkHat,
    alt: "Two men in terracotta and green patchwork shirts, one in a straw hat",
    pos: "50% 30%",
    title: "The weekend shirt",
    eyebrow: "Shirts",
    links: [
      { label: "Shop men", href: shopHref("men") },
      { label: "Shop fabrics", href: shopHref("fabrics") },
    ],
  },
];

/** Home banner: a slider with the overlay Header layered on top. */
export function Hero() {
  return (
    <section aria-label="Featured collections" className="relative h-[680px] overflow-hidden bg-espresso md:h-[960px]">
      <h1 className="sr-only">Woodin shop: wax-print ready-to-wear and fabrics</h1>
      <HeroSlider slides={SLIDES} />
      <div className="absolute inset-x-0 top-0 z-20">
        <Header variant="overlay" />
      </div>
    </section>
  );
}
