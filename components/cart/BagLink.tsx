"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { BagIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/format";
import { PRICE_PLACEHOLDER } from "@/lib/placeholder";
import { useCart } from "./CartProvider";

/**
 * The bag in the navbar. Clicking it opens a small panel with what is in the bag, the subtotal and a
 * "View bag" button to the full cart page; it does not navigate by itself. Closes on outside click, Esc,
 * or when a link inside it is followed.
 */
export function BagLink() {
  const { cart, status } = useCart();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const count = cart?.itemCount ?? 0;
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const currency = cart?.currency ?? "GHS";
  const money = (n: number | null) => (n === null ? PRICE_PLACEHOLDER : formatMoney(n, currency));

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center gap-1.5 px-2 text-[13px] tracking-[0.08em]"
      >
        <BagIcon />({count})
      </button>

      {open ? (
        <div role="region" aria-label="Your bag" className="absolute right-0 top-full z-40 mt-1 w-[min(92vw,380px)] border border-line bg-ivory text-ink shadow-[0_12px_32px_rgba(26,18,14,0.14)]">
          {status === "loading" && !cart ? (
            <div aria-busy="true" className="flex flex-col gap-3 p-5">
              <div className="h-16 animate-pulse bg-sand" />
              <div className="h-16 animate-pulse bg-sand" />
            </div>
          ) : !cart || cart.items.length === 0 ? (
            <div className="flex flex-col items-start gap-4 p-6">
              <span className="font-display text-[22px]">Your bag is empty</span>
              <p className="m-0 text-[14px] font-light text-body">{status === "error" ? "We could not load your bag right now." : "Add a piece you love and it will show up here."}</p>
              <Button href="/shop" onClick={close} variant="outline-brown" className="w-full">Continue shopping</Button>
            </div>
          ) : (
            <>
              <ul className="m-0 flex max-h-[min(55vh,340px)] list-none flex-col overflow-y-auto p-0">
                {cart.items.map((item) => (
                  <li key={item.key} className="flex gap-3.5 border-b border-line px-5 py-4">
                    <Link href={`/product/${item.slug}`} onClick={close} className="relative block h-[72px] w-14 shrink-0 overflow-hidden bg-sand">
                      {item.image ? <Image src={item.image} alt="" fill sizes="56px" className="object-cover object-top" /> : null}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Link href={`/product/${item.slug}`} onClick={close} className="font-display text-[17px] leading-tight text-ink no-underline">
                        {item.name}
                      </Link>
                      {item.variation.length > 0 ? (
                        <span className="text-[12px] font-light text-muted">{item.variation.map((v) => `${v.attribute} ${v.value}`).join(" · ")}</span>
                      ) : null}
                      <span className="mt-auto text-[13px] font-light text-body">
                        {item.quantity} × {money(item.unitPrice)}
                      </span>
                    </div>
                    <span className="shrink-0 text-[14px]">{money(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-4 p-5">
                <div className="flex items-baseline justify-between">
                  <span className="label-caps tracking-[0.16em]">Subtotal</span>
                  <span className="font-display text-[22px]">{money(cart.subtotal)}</span>
                </div>
                <Button href="/cart" onClick={close} className="w-full">View bag</Button>
                <span className="text-center text-[12px] font-light text-muted">Delivery is added at checkout.</span>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
