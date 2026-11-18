"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CoverImage } from "@/components/ui/CoverImage";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

export interface HeroSlide {
  id: string;
  image: string;
  alt: string;
  /** object-position crop */
  pos: string;
  eyebrow: string;
  title: string;
  links: { label: string; href: string }[];
}

const INTERVAL_MS = 6500;

/**
 * Home banner: crossfading campaign slides.
 * - Auto-advances every 6.5s, never paused by hover; does not auto-play when the visitor prefers
 *   reduced motion.
 * - Side arrows and touch swipe. Inactive slides are `inert` so links inside them are not tabbable.
 * Fills its (relative) parent; the overlay Header is layered on top by <Hero>.
 */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const touchStart = useRef<number | null>(null);
  const count = slides.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduced) return;
    // Restarts after every change (manual or automatic) so a click never gets cut short.
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [reduced, index, count]);

  const go = (next: number) => setIndex((next + count) % count);

  const ctl =
    "flex h-11 w-11 items-center justify-center border-0 bg-transparent text-white transition-opacity hover:opacity-80";

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="absolute inset-0"
      onTouchStart={(e) => {
        touchStart.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      {slides.map((s, i) => {
        const active = i === index;
        return (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={!active}
            inert={!active}
            className={`absolute inset-0 transition-opacity duration-[900ms] ease-in-out ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <CoverImage src={s.image} alt={s.alt} pos={s.pos} sizes="100vw" priority={i === 0} />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,18,14,0.5)_0%,rgba(26,18,14,0)_24%,rgba(26,18,14,0)_44%,rgba(26,18,14,0.7)_100%)]"
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-[22px] px-4 pb-16 text-center text-white md:pb-24">
              <h2 className="m-0 font-display text-[clamp(30px,8vw,104px)] font-normal uppercase leading-none tracking-[0.14em]">
                {s.title}
              </h2>
              <span className="text-xs uppercase tracking-[0.34em] md:text-lg md:tracking-[0.42em]">{s.eyebrow}</span>
              <nav aria-label={`Shop ${s.title}`} className="mt-2 flex flex-wrap justify-center gap-x-8 gap-y-3 md:mt-[18px] md:gap-x-[52px]">
                {s.links.map((l) => (
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
          </div>
        );
      })}

      {/* Arrows (desktop) */}
      <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className={`${ctl} absolute left-2 top-1/2 hidden -translate-y-1/2 md:flex`}>
        <ChevronLeftIcon size={28} />
      </button>
      <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className={`${ctl} absolute right-2 top-1/2 hidden -translate-y-1/2 md:flex`}>
        <ChevronRightIcon size={28} />
      </button>
    </div>
  );
}
