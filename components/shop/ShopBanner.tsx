"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ShopBanner as Banner } from "@/lib/banners";

const SLIDE_MS = 6500;

/**
 * Shop-page banner: up to two slides (managed in WordPress), cross-fading every few seconds.
 * Pauses on hover/focus and with the pause button, and never auto-advances for people who
 * prefer reduced motion. One slide shows no controls.
 */
export function ShopBanner({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false); // hover or keyboard focus inside
  const [reduced, setReduced] = useState(true); // assume reduced until we know, so nothing moves on first paint

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const many = banners.length > 1;
  const running = many && !paused && !held && !reduced;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % banners.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [running, index, banners.length]);

  if (banners.length === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="New arrivals"
      className="content-wrap pt-2"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <div className="relative min-h-[440px] overflow-hidden bg-espresso md:min-h-[520px]">
        {banners.map((b, i) => {
          const active = i === index;
          return (
            <div
              key={b.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${banners.length}`}
              aria-hidden={!active}
              inert={!active}
              className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <Image
                src={b.image.url}
                alt={b.image.alt}
                fill
                sizes="(min-width: 1536px) 1700px, 100vw"
                priority={i === 0}
                className="object-cover object-[70%_center]"
              />
              {/* Darkens the left so the text stays readable over any photo. */}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent md:via-black/15" />

              <div className="relative flex h-full min-h-[440px] flex-col items-start justify-center gap-4 px-6 py-12 md:min-h-[520px] md:max-w-[780px] md:gap-5 md:px-12">
                {b.badge && <span className="label-caps bg-gold-btn px-3.5 py-2 font-semibold tracking-[0.2em] text-brown">{b.badge}</span>}
                {b.eyebrow && <span className="label-caps tracking-[0.24em] text-gold-light">{b.eyebrow}</span>}
                <h2 className="m-0 font-display text-[clamp(40px,6vw,80px)] font-normal leading-[0.98] text-white">{b.heading}</h2>
                {b.text && <p className="m-0 max-w-[560px] text-[17px] font-light leading-relaxed text-white md:text-[19px]">{b.text}</p>}
                {(b.ctaLabel && b.ctaUrl) || (b.linkLabel && b.linkUrl) ? (
                  <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-4">
                    {b.ctaLabel && b.ctaUrl && (
                      <Button href={b.ctaUrl} variant="ivory" className="px-8 py-[18px]">
                        {b.ctaLabel}
                      </Button>
                    )}
                    {b.linkLabel && b.linkUrl && (
                      <Link href={b.linkUrl} className="label-caps border-b border-white pb-1 text-white no-underline">
                        {b.linkLabel}
                      </Link>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {many && (
          <>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play slideshow" : "Pause slideshow"}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 md:right-5 md:top-5"
            >
              {paused ? (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" fill="currentColor" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5h3v11H3zm5 0h3v11H8z" fill="currentColor" /></svg>
              )}
            </button>
            <div className="absolute bottom-5 left-6 z-10 flex gap-2 md:bottom-7 md:left-12" role="group" aria-label="Choose slide">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show slide ${i + 1}`}
                  aria-current={i === index}
                  className="flex h-6 w-9 items-center"
                >
                  <span className={`block h-[3px] w-full transition-colors ${i === index ? "bg-white" : "bg-white/40"}`} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
