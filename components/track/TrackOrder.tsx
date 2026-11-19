"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import type { TrackingView } from "@/lib/tracking";

const field = "h-[54px] border border-line-strong bg-white px-4 text-[15px]";
const label = "label-caps tracking-[0.14em]";

/** Order number + email form, and the result: progress steps, Ghana Post tracking number, items. */
export function TrackOrder() {
  const prefill = useSearchParams().get("order") ?? "";
  const [view, setView] = useState<TrackingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const data = new FormData(ev.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: String(data.get("order") ?? ""), email: String(data.get("email") ?? "") }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setView(null);
        setError(body?.message ?? "We could not look that up right now. Please try again.");
        return;
      }
      setView(body as TrackingView);
    } catch {
      setError("We could not reach the shop. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="content-wrap pb-24 pt-12 md:pt-16">
      <div className="mx-auto flex max-w-[760px] flex-col gap-10">
        <div className="flex flex-col gap-3.5">
          <span className="label-caps tracking-[0.28em] text-gold">Your order</span>
          <h1 className="m-0 font-display text-[clamp(34px,4.5vw,60px)] font-normal leading-none text-brown">Track your order</h1>
          <p className="m-0 text-base font-light leading-[1.7] text-body">
            Enter the order number from your confirmation (for example 5470) and the email you used at checkout.
          </p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="trk-order" className={label}>Order number</label>
            <input id="trk-order" name="order" inputMode="numeric" autoComplete="off" required defaultValue={prefill} placeholder="5470" className={field} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="trk-email" className={label}>Email</label>
            <input id="trk-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className={field} />
          </div>
          <button type="submit" disabled={busy} className="label-caps h-[54px] border-0 bg-brown px-8 tracking-[0.18em] text-ivory transition-colors hover:bg-[#3a1307] disabled:bg-[#a99e90]">
            {busy ? "Checking…" : "Track"}
          </button>
        </form>

        <div role="status" aria-live="polite">
          {error ? <p className="m-0 border border-lowstock bg-white px-4 py-3 text-sm text-lowstock">{error}</p> : null}
        </div>

        {view ? <Result view={view} /> : null}
      </div>
    </section>
  );
}

function Result({ view }: { view: TrackingView }) {
  const placed = view.placedAt ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(new Date(view.placedAt)) : null;
  const money = (n: string | number) => formatMoney(Number(n), view.currency || "GHS");

  return (
    <article aria-label={`Order ${view.orderNumber}`} className="flex flex-col gap-7 border border-line bg-white p-6 md:p-9">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 font-display text-[clamp(26px,3vw,34px)] font-normal leading-tight">Order #{view.orderNumber}</h2>
        {placed ? <span className="text-sm font-light text-muted">Placed {placed}</span> : null}
      </header>

      <div className="flex flex-col gap-1.5">
        <span className={`font-display text-[28px] leading-none ${view.cancelled ? "text-lowstock" : "text-brown"}`}>{view.statusLabel}</span>
        <p className="m-0 text-[15px] font-light text-body">{view.statusNote}</p>
      </div>

      {view.steps.length > 0 ? (
        <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-5">
          {view.steps.map((s, i) => (
            <li key={s.key} aria-current={s.state === "current" ? "step" : undefined} className="flex flex-col gap-2">
              <span className={`h-1 ${s.state === "done" ? "bg-instock-dot" : s.state === "current" ? "bg-brown" : "bg-line"}`} />
              <span className={`text-[13px] ${s.state === "todo" ? "text-muted" : "font-medium text-ink"}`}>
                <span className="sr-only">Step {i + 1}: </span>
                {s.label}
                <span className="sr-only">{s.state === "done" ? " (done)" : s.state === "current" ? " (in progress)" : ""}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {view.tracking ? (
        <div className="flex flex-col gap-3 border border-line bg-ivory p-5">
          <span className="label-caps tracking-[0.18em]">{view.tracking.carrier} tracking number</span>
          <span className="font-display text-[26px] leading-none tracking-[0.04em]">{view.tracking.number}</span>
          {view.tracking.url ? (
            <Button href={view.tracking.url} target="_blank" rel="noopener noreferrer" variant="outline-brown" className="self-start">
              Track with {view.tracking.carrier}
            </Button>
          ) : (
            <p className="m-0 text-sm font-light text-body">Use this number on the {view.tracking.carrier} website to follow your parcel.</p>
          )}
        </div>
      ) : null}

      <dl className="m-0 flex flex-col gap-2.5 border-t border-line pt-5 text-[15px] font-light">
        {view.items.map((i, k) => (
          <div key={k} className="flex justify-between gap-4"><dt>{i.name}</dt><dd className="m-0">× {i.quantity}</dd></div>
        ))}
        {view.delivery ? <div className="flex justify-between gap-4"><dt>{view.pickup ? "Collection" : "Delivery"}</dt><dd className="m-0 text-right">{view.delivery}</dd></div> : null}
        <div className="flex justify-between gap-4 font-medium"><dt>Total</dt><dd className="m-0">{money(view.total)}</dd></div>
        {view.refunded ? <div className="flex justify-between gap-4 text-instock"><dt>Refunded</dt><dd className="m-0">{money(view.refunded)}</dd></div> : null}
      </dl>
    </article>
  );
}
