"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { CoverImage } from "@/components/ui/CoverImage";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { WorldCard } from "@/data/home";

/** Cards visible at once on desktop: 3 whole + half of the 4th. */
const VISIBLE_WHOLE = 3;

/**
 * "The World of Woodin" carousel.
 * - md and up: 3.5 cards, translateX stepped by one card (same maths as the design), arrows at the top right.
 * - below md: native horizontal scroll-snap, so it swipes on a phone (arrows hidden).
 */
export function WorldCarousel({ cards }: { cards: WorldCard[] }) {
  const [index, setIndex] = useState(0);
  const max = cards.length - VISIBLE_WHOLE;
  const slide = Math.min(index, max);

  const arrow =
    "flex h-16 w-[68px] items-center justify-center border-0 bg-transparent text-ink disabled:text-[#a99e90]";

  return (
    <section aria-label="The World of Woodin" className="pb-16 pt-16 md:pb-28 md:pt-[104px]">
      <div className="content-wrap flex flex-wrap items-end justify-between gap-6 pb-8 md:pb-11">
        <div className="flex flex-col gap-3.5">
          <h2 className="m-0 font-display text-[clamp(36px,5.5vw,68px)] font-normal leading-none">
            The World of Woodin
          </h2>
          <p className="m-0 font-display text-lg text-body md:text-[23px]">
            Explore the new season, signature prints and more
          </p>
        </div>
        <div role="group" aria-label="Carousel controls" className="hidden items-center bg-sand md:flex">
          <button type="button" aria-label="Previous" disabled={slide === 0} onClick={() => setIndex(slide - 1)} className={arrow}>
            <ChevronLeftIcon />
          </button>
          <span aria-hidden="true" className="h-8 w-px bg-ink opacity-40" />
          <button type="button" aria-label="Next" disabled={slide === max} onClick={() => setIndex(slide + 1)} className={arrow}>
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div
        role="group"
        aria-roledescription="carousel"
        aria-label="World of Woodin collections"
        className="snap-x snap-mandatory overflow-x-auto pl-4 [scrollbar-width:none] md:snap-none md:overflow-hidden md:pl-[max(32px,calc((100%_-_1360px)/2_+_32px))] [&::-webkit-scrollbar]:hidden"
      >
        <ul
          className="m-0 flex list-none gap-5 p-0 pr-4 md:pr-0 md:transition-transform md:duration-[600ms] md:ease-[cubic-bezier(0.2,0.7,0.2,1)] md:[transform:translateX(var(--tx))]"
          style={{ "--tx": `calc(${-slide} * ((100% - 60px) / 3.5 + 20px))` } as CSSProperties}
        >
          {cards.map((card) => (
            <li
              key={card.title}
              className="w-[78%] shrink-0 snap-start sm:w-[46%] md:w-[calc((100%_-_60px)/3.5)]"
            >
              <Link
                href={card.href}
                className="relative flex aspect-[11/15] flex-col justify-end overflow-hidden bg-espresso p-6 text-white no-underline md:p-10"
              >
                <CoverImage
                  src={card.img}
                  alt={card.alt}
                  pos={card.pos}
                  sizes="(min-width: 768px) 28vw, 78vw"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[linear-gradient(0deg,rgba(26,18,14,0.62)_0%,rgba(26,18,14,0)_46%)]"
                />
                <span className="relative text-xs font-semibold uppercase tracking-[0.2em]">{card.eyebrow}</span>
                <span className="relative mt-3.5 font-display text-[clamp(28px,3.2vw,44px)] leading-[1.05]">
                  {card.title}
                </span>
                <span className="relative mt-5 self-start border-b border-white pb-1.5 text-sm uppercase tracking-[0.14em]">
                  Shop now
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
