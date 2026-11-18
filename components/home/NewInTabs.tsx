"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { ProductCardData } from "@/lib/types";

export interface NewInTab {
  id: string;
  label: string;
  products: ProductCardData[];
}

/**
 * "New in" with tabs on the far right (Fabrics first, then Ready to wear).
 * Standard tab pattern: arrow keys move between tabs, only the active panel is shown.
 */
export function NewInTabs({ tabs }: { tabs: NewInTab[] }) {
  const [active, setActive] = useState(0);
  const uid = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };

  return (
    <section className="content-wrap pb-16 md:pb-[110px]">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-x-4 gap-y-5">
        <div className="flex flex-col gap-2.5">
          <Eyebrow>Just landed</Eyebrow>
          <h2 className="m-0 font-display text-[clamp(36px,5vw,58px)] font-normal leading-none">New in</h2>
        </div>

        <div role="tablist" aria-label="New in categories" className="ml-auto flex gap-2">
          {tabs.map((t, i) => {
            const on = i === active;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${uid}-tab-${t.id}`}
                aria-selected={on}
                aria-controls={`${uid}-panel-${t.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={(e) => onKey(e, i)}
                className={`label-caps h-11 border px-5 tracking-[0.16em] transition-colors ${
                  on ? "border-brown bg-brown text-ivory" : "border-line-strong bg-transparent text-ink hover:border-brown"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tabs.map((t, i) => (
        <div key={t.id} role="tabpanel" id={`${uid}-panel-${t.id}`} aria-labelledby={`${uid}-tab-${t.id}`} hidden={i !== active}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 lg:grid-cols-4">
            {t.products.map((p, j) => (
              <ProductCard key={p.slug} product={p} priority={i === 0 && j < 2} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
