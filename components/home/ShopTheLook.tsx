"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { CoverImage } from "@/components/ui/CoverImage";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { formatMoney } from "@/lib/format";
import { IMG } from "@/lib/images";

export interface LookProduct {
  id: number;
  slug: string;
  title: string;
  category: string;
  image: string;
  price: number | null;
  priceLabel: string;
}

/** "Shop the look": one campaign image, the real products worn in it, and one add-all button. */
export function ShopTheLook({ items }: { items: LookProduct[] }) {
  const { add, busy } = useCart();
  const [added, setAdded] = useState(false);
  const total = items.every((i) => i.price !== null) ? items.reduce((n, i) => n + (i.price ?? 0), 0) : null;

  async function addAll() {
    // One at a time: each add rewrites the cart cookie, so parallel requests would overwrite each other.
    for (const item of items) {
      const next = await add({ productId: item.id, variation: [{ attribute: "Size", value: "M" }] });
      if (!next) return;
    }
    setAdded(true);
  }

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
              <li key={item.id}>
                <Link
                  href={`/product/${item.slug}`}
                  className="flex items-center gap-4 border-b border-line-strong py-3.5 text-ink no-underline"
                >
                  <span className="relative h-20 w-16 shrink-0 overflow-hidden bg-white">
                    <CoverImage src={item.image} alt="" pos="50% 20%" sizes="64px" />
                  </span>
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="font-display text-[19px]">{item.title}</span>
                    <span className="text-[13px] text-muted">{item.category}</span>
                  </span>
                  <span className="text-[15px]">{item.priceLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addAll}
            disabled={busy || added}
            className="label-caps h-[58px] border-0 bg-brown text-ivory transition-colors hover:bg-[#3a1307] disabled:bg-brown/80"
          >
            {added
              ? `Added — ${items.length} pieces in your bag`
              : busy
                ? "Adding…"
                : `Add the full look · ${total === null ? "GH₵ [TOTAL]" : formatMoney(total, "GHS")}`}
          </button>
          <p role="status" className="m-0 min-h-5 text-[13px] text-muted">
            {added ? (
              <>
                Size M added. <Link href="/cart">View bag</Link>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </section>
  );
}
