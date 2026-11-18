"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { HeartIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/format";
import type { SizeOption } from "@/lib/types";

interface Props {
  productId: number;
  title: string;
  priceLabel: string;
  inStock: boolean;
  /** Empty for products sold without sizes (fabrics, accessories). */
  sizes: SizeOption[];
  /** Free-delivery threshold in GH₵, null when unconfigured. */
  threshold: number | null;
  /** True while sizes/stock are demo data. */
  sizesAreDemo: boolean;
}

/** Size picker (in / low / sold-out), add to bag, wishlist heart and the "added" confirmation. */
export function PurchasePanel({ productId, title, priceLabel, inStock, sizes, threshold, sizesAreDemo }: Props) {
  const { add, busy, error } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [wish, setWish] = useState(false);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);

  const needsSize = sizes.length > 0;
  const picked = sizes.find((s) => s.label === size);
  const canAdd = inStock && (!needsSize || (picked !== undefined && picked.state !== "out"));

  const stockNote =
    picked?.state === "low" ? `Only ${picked.left} left in ${picked.label}.` : picked?.state === "out" ? `Sold out in ${picked.label}.` : "";
  const label = !inStock
    ? "Sold out"
    : needsSize && !picked
      ? "Select a size"
      : `Add to bag · ${priceLabel}`;

  async function onAdd() {
    if (!canAdd) return;
    const next = await add({
      productId,
      variation: needsSize && size ? [{ attribute: "Size", value: size }] : [],
    });
    if (!next) return;
    const remaining = threshold !== null && next.subtotal !== null ? threshold - next.subtotal : null;
    setAddedMsg(
      remaining === null
        ? "Added to your bag. GH₵ [X] away from free delivery."
        : remaining > 0
          ? `Added to your bag. ${formatMoney(remaining, next.currency)} away from free delivery.`
          : "Added to your bag. You have unlocked free delivery.",
    );
  }

  return (
    <div className="flex flex-col gap-[26px]">
      {needsSize ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span id="size-label" className="label-caps tracking-[0.18em]">
              Size ·{" "}
              <span className="text-sm font-light normal-case tracking-[0.06em]">{size ?? "select"}</span>
            </span>
            <Link href="#size-guide" className="py-3 text-[13px]">
              Size guide
            </Link>
          </div>
          <div role="group" aria-labelledby="size-label" className="grid grid-cols-5 gap-2">
            {sizes.map((s) => {
              const out = s.state === "out";
              const on = size === s.label;
              return (
                <button
                  key={s.label}
                  type="button"
                  disabled={out}
                  aria-pressed={on}
                  aria-label={out ? `${s.label}, sold out` : s.state === "low" ? `${s.label}, low stock` : s.label}
                  onClick={() => {
                    setSize(s.label);
                    setAddedMsg(null);
                  }}
                  className={`h-[52px] text-sm font-medium ${
                    out
                      ? "border border-dashed border-line-strong bg-transparent text-[#8c8279] line-through"
                      : on
                        ? "border border-brown bg-brown text-ivory"
                        : "border border-line-strong bg-white text-ink hover:border-brown"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <span role="status" className="min-h-[18px] text-[13px] font-medium text-lowstock">
            {stockNote}
          </span>
          {sizesAreDemo ? (
            <span className="text-[13px] font-light text-muted">Model is [X] cm and wears M.</span>
          ) : null}
        </div>
      ) : (
        <p className="m-0 text-sm font-light text-muted">Sold by the piece · [LENGTH]</p>
      )}

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd || busy}
          className="label-caps h-[60px] flex-1 border-0 bg-brown tracking-[0.2em] text-ivory transition-colors hover:bg-[#3a1307] disabled:bg-[#a99e90] disabled:text-white"
        >
          {busy ? "Adding…" : label}
        </button>
        <button
          type="button"
          aria-label={`Save ${title} to wishlist`}
          aria-pressed={wish}
          onClick={() => setWish((w) => !w)}
          className="flex h-[60px] w-[60px] items-center justify-center border border-brown bg-transparent text-brown"
        >
          <HeartIcon fill={wish ? "currentColor" : "none"} />
        </button>
      </div>

      <div role="status" aria-live="polite">
        {addedMsg ? (
          <Link
            href="/cart"
            className="flex items-center justify-between gap-3 border border-brown bg-white px-[18px] py-4 text-sm text-ink no-underline"
          >
            <span>{addedMsg}</span>
            <span className="label-caps shrink-0 tracking-[0.16em] text-brown">View bag</span>
          </Link>
        ) : null}
        {error ? <p className="m-0 text-[13px] text-lowstock">{error}</p> : null}
      </div>
    </div>
  );
}
