"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { formatMoney } from "@/lib/format";
import { useCart } from "./CartProvider";
import { FreeDeliveryBar } from "./FreeDeliveryBar";

function CartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your bag" className="flex flex-col gap-6">
      <div className="h-[84px] animate-pulse bg-sand" />
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-6 border-b border-line py-6">
          <div className="h-[180px] w-[140px] shrink-0 animate-pulse bg-sand" />
          <div className="flex flex-1 flex-col gap-3">
            <div className="h-6 w-2/3 animate-pulse bg-sand" />
            <div className="h-4 w-1/3 animate-pulse bg-sand" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyBag() {
  return (
    <div className="flex flex-col items-center gap-[18px] py-14 text-center">
      <span className="font-display text-[34px]">Your bag is empty</span>
      <Button href="/shop" variant="primary" className="px-[34px] py-[18px]">
        Shop new in
      </Button>
    </div>
  );
}

export function CartView({ threshold }: { threshold: number | null }) {
  const { cart, status, busy, error, setQuantity, remove, applyCoupon } = useCart();
  const [code, setCode] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  const count = cart?.itemCount ?? 0;
  const currency = cart?.currency ?? "GHS";
  const money = (n: number | null) => (n === null ? "GH₵ [PRICE]" : formatMoney(n, currency));

  return (
    <>
      <section className="content-wrap flex flex-wrap items-end justify-between gap-4 pb-6 pt-10 md:pt-14">
        <h1 className="m-0 font-display text-[clamp(30px,4vw,48px)] font-normal leading-none text-brown">
          Your bag <span className="text-[0.45em] italic text-muted">({count})</span>
        </h1>
        <Link href="/shop" className="label-caps py-3 text-ink">
          Continue shopping
        </Link>
      </section>

      <section className="content-wrap flex flex-wrap items-start gap-10 pb-20 md:gap-12 md:pb-[88px]">
        <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-5">
          {status === "loading" ? (
            <CartSkeleton />
          ) : status === "error" ? (
            <div role="alert" className="border border-line bg-white p-6">
              <p className="m-0 mb-3 text-[15px]">We could not load your bag.</p>
              <Button variant="outline-brown" onClick={() => window.location.reload()}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              <FreeDeliveryBar subtotal={cart?.subtotal ?? null} threshold={threshold} currency={currency} />
              {cart && cart.items.length > 0 ? (
                <ul className="m-0 flex list-none flex-col border-t border-line p-0">
                  {cart.items.map((item) => (
                    <li key={item.key} className="flex gap-4 border-b border-line py-6 md:gap-6">
                      <Link href={`/product/${item.slug}`} className="relative block h-[150px] w-[110px] shrink-0 overflow-hidden bg-sand md:h-[180px] md:w-[140px]">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill sizes="140px" className="object-cover object-top" />
                        ) : null}
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex justify-between gap-4">
                          <Link href={`/product/${item.slug}`} className="font-display text-xl leading-tight text-ink no-underline md:text-2xl">
                            {item.name}
                          </Link>
                          <span className="shrink-0 text-[17px] font-light">{money(item.lineTotal)}</span>
                        </div>
                        {item.variation.length > 0 ? (
                          <span className="text-sm font-light text-muted">
                            {item.variation.map((v) => `${v.attribute} ${v.value}`).join(" · ")}
                          </span>
                        ) : null}
                        <span className={`text-[13px] ${item.inStock ? "text-instock" : "text-lowstock"}`}>
                          {item.inStock ? "In stock · ready to ship" : "Out of stock"}
                        </span>
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                          <QuantityStepper
                            label={`Quantity for ${item.name}`}
                            value={item.quantity}
                            min={1}
                            disabled={busy}
                            onChange={(q) => void setQuantity(item.key, q)}
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void remove(item.key)}
                            className="h-11 border-0 bg-transparent p-0 text-[13px] text-body underline"
                          >
                            Remove
                            <span className="sr-only"> {item.name}</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyBag />
              )}
            </>
          )}
        </div>

        <aside aria-label="Order summary" className="flex min-w-0 flex-[1_1_360px] flex-col gap-[18px] border border-line bg-white p-6 md:p-[30px]">
          <h2 className="m-0 font-display text-[30px] font-normal">Order summary</h2>
          <dl className="m-0 flex flex-col gap-2.5 text-[15px] font-light">
            <div className="flex justify-between">
              <dt>Subtotal ({count} {count === 1 ? "item" : "items"})</dt>
              <dd className="m-0">{money(cart?.subtotal ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd className="m-0">Calculated at checkout</dd>
            </div>
          </dl>

          <form
            className="flex flex-col gap-1.5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!code.trim()) return;
              setCouponMsg(null);
              const next = await applyCoupon(code.trim());
              if (next) setCouponMsg("Code applied.");
            }}
          >
            <label htmlFor="cart-promo" className="label-caps tracking-[0.16em]">
              Promo or gift code
            </label>
            <div className="flex gap-2">
              <input
                id="cart-promo"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code"
                className="h-12 min-w-0 flex-1 border border-line-strong bg-ivory px-3 text-[15px]"
              />
              <Button type="submit" variant="outline-brown" disabled={busy || !code.trim()} className="h-12 px-[18px] py-0 tracking-[0.16em]">
                Apply
              </Button>
            </div>
            <p role="status" className="m-0 min-h-5 text-[13px] text-lowstock">
              {couponMsg ?? error}
            </p>
          </form>

          <div className="flex items-baseline justify-between border-t border-line pt-4">
            <span className="label-caps tracking-[0.18em]">Estimated total</span>
            <span className="font-display text-[30px]">{money(cart?.total ?? 0)}</span>
          </div>

          {count > 0 ? (
            <>
              <Button href="/checkout" size="lg" variant="primary" className="h-[60px]">
                Checkout securely
              </Button>
              <Link
                href="/checkout?pay=momo"
                className="flex h-[60px] items-center justify-center gap-2.5 bg-momo text-xs font-semibold uppercase tracking-[0.16em] text-ink no-underline"
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="6" y="2" width="12" height="20" rx="2" />
                  <path d="M11 18h2" />
                </svg>
                Express pay with MoMo
              </Link>
            </>
          ) : (
            <span className="label-caps flex h-[60px] items-center justify-center bg-line text-muted">Checkout securely</span>
          )}

          <ul className="m-0 flex list-none flex-col gap-2.5 border-t border-line p-0 pt-4 text-[13px] font-light text-body">
            <li>✓ Secure payment by Paystack</li>
            <li>✓ Size exchanges in store within 3 business days</li>
          </ul>
        </aside>
      </section>
    </>
  );
}
