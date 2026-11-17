"use client";

import Link from "next/link";
import { useState } from "react";
import { CoverImage } from "@/components/ui/CoverImage";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IMG } from "@/lib/images";
import { PRICE_PLACEHOLDER } from "@/lib/placeholder";
import type { LookItem } from "@/data/home";

/**
 * "Shop the look": one campaign image, three pieces cropped from it, one add-all button.
 * TODO(step 3): "Add the full look" posts the three items to /api/cart/add-item as a batch.
 */
export function ShopTheLook({ items }: { items: LookItem[] }) {
  const [added, setAdded] = useState(false);

  return (
    <section className="bg-sand">
      <div className="content-wrap grid items-center gap-10 py-16 md:py-[100px] lg:grid-cols-[1.3fr_1fr] lg:gap-16">
        <div className="relative h-[420px] overflow-hidden md:h-[640px]">
          <CoverImage
            src={IMG.modelsSmiling}
            alt="Three models smiling in Woodin print shirts"
            pos="50% 30%"
            sizes="(min-width: 1024px) 56vw, 100vw"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-[22px]">
          <Eyebrow>Shop the look</Eyebrow>
          <h2 className="m-0 font-display text-[clamp(34px,4.5vw,52px)] font-normal leading-[1.02]">
            Sky-blue days, <span className="italic">printed</span>.
          </h2>
          <ul className="m-0 flex list-none flex-col border-t border-line-strong p-0">
            {items.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/product/${item.slug}`}
                  className="flex items-center gap-4 border-b border-line-strong py-3.5 text-ink no-underline"
                >
                  <span className="relative h-20 w-16 shrink-0 overflow-hidden">
                    <CoverImage src={IMG.modelsSmiling} alt="" pos={item.pos} sizes="64px" />
                  </span>
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="font-display text-[19px]">{item.title}</span>
                    <span className="text-[13px] text-muted">{item.cat}</span>
                  </span>
                  <span className="text-[15px]">{PRICE_PLACEHOLDER}</span>
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setAdded(true)}
            className="label-caps h-[58px] border-0 bg-brown text-ivory transition-colors hover:bg-[#3a1307]"
          >
            {added ? "Added — 3 pieces in your bag" : "Add the full look · GH₵ [TOTAL]"}
          </button>
        </div>
      </div>
    </section>
  );
}
