"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { BagPlusIcon, CheckIcon } from "@/components/ui/icons";
import type { SizeOption } from "@/lib/types";

interface QuickAddProps {
  productId: number;
  title: string;
  inStock: boolean;
  /** Empty for products without sizes (fabrics): they add straight away. */
  sizes: SizeOption[];
}

/**
 * Add-to-bag icon on a product card (mobile and desktop).
 * No sizes: one tap adds it. With sizes: opens a small size picker on the card, and picking a
 * size adds it. Esc or a click elsewhere closes the picker.
 */
export function QuickAdd({ productId, title, inStock, sizes }: QuickAddProps) {
  const { add } = useCart();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"idle" | "added" | "error">("idle");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (status === "idle") return;
    const t = setTimeout(() => setStatus("idle"), 1800);
    return () => clearTimeout(t);
  }, [status]);

  async function addToBag(size?: string) {
    setOpen(false);
    setPending(true);
    const next = await add({ productId, variation: size ? [{ attribute: "Size", value: size }] : [] });
    setPending(false);
    setStatus(next ? "added" : "error");
  }

  function onClick() {
    if (!inStock || pending) return;
    if (sizes.length > 0) setOpen((o) => !o);
    else void addToBag();
  }

  return (
    <div ref={root} className="pointer-events-none absolute inset-0">
      {open ? (
        <div
          role="group"
          aria-label={`Choose a size for ${title}`}
          className="pointer-events-auto absolute inset-x-2 bottom-14 bg-ivory p-3 shadow-[0_2px_14px_rgba(26,18,14,0.18)]"
        >
          <span className="label-caps mb-2 block text-[11px] tracking-[0.16em]">Select a size</span>
          <div className="grid grid-cols-5 gap-1.5">
            {sizes.map((s) => {
              const out = s.state === "out";
              return (
                <button
                  key={s.label}
                  type="button"
                  disabled={out}
                  aria-label={out ? `${s.label}, sold out` : s.state === "low" ? `${s.label}, low stock` : s.label}
                  onClick={() => void addToBag(s.label)}
                  className={`h-10 text-[13px] font-medium ${
                    out
                      ? "border border-dashed border-line-strong text-[#8c8279] line-through"
                      : "border border-line-strong bg-white text-ink hover:border-brown hover:bg-brown hover:text-ivory"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onClick}
        disabled={!inStock}
        aria-busy={pending}
        aria-label={inStock ? `Add ${title} to bag` : `${title} is sold out`}
        aria-expanded={sizes.length > 0 ? open : undefined}
        className="pointer-events-auto absolute bottom-1.5 right-1.5 flex h-11 w-11 items-center justify-center disabled:opacity-50"
      >
        <span
          className={`flex h-[34px] w-[34px] items-center justify-center rounded-full transition-colors ${
            pending ? "animate-pulse bg-ivory text-brown" : status === "added" ? "bg-brown text-ivory" : status === "error" ? "bg-lowstock text-ivory" : "bg-ivory text-brown hover:bg-brown hover:text-ivory"
          }`}
        >
          {status === "added" ? <CheckIcon size={16} /> : <BagPlusIcon size={17} />}
        </span>
      </button>

      <span role="status" aria-live="polite" className="sr-only">
        {pending ? `Adding ${title}` : status === "added" ? `${title} added to your bag` : status === "error" ? `Could not add ${title}` : ""}
      </span>
    </div>
  );
}
