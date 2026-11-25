import { SafeImage } from "@/components/ui/SafeImage";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { AccountOrder } from "@/lib/account-orders";
import type { TrackingStep } from "@/lib/tracking";

const dateFmt = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" });
export const orderDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "");
const money = (o: AccountOrder) => formatMoney(Number(o.view.total), o.view.currency);
const countLabel = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;

const CHIP: Record<string, string> = {
  shipped: "bg-[#FBF3DE] text-[#7A5410]",
  "ready-collection": "bg-[#FBF3DE] text-[#7A5410]",
  completed: "bg-[#E7F1EA] text-instock",
  cancelled: "bg-line text-muted",
  refunded: "bg-line text-muted",
};

export function StatusChip({ order }: { order: AccountOrder }) {
  return (
    <span className={`inline-block px-3 py-[7px] text-[11px] font-semibold uppercase tracking-[0.16em] ${CHIP[order.status] ?? "bg-sand text-body"}`}>
      {order.view.statusLabel}
    </span>
  );
}

function Thumbs({ urls, size }: { urls: string[]; size: "sm" | "md" }) {
  if (urls.length === 0) return null;
  const cls = size === "md" ? "h-20 w-16" : "h-[70px] w-14";
  return (
    <div className="flex gap-2">
      {urls.map((src) => (
        <SafeImage key={src} src={src} alt="" width={64} height={80} sizes="64px" className={`${cls} object-cover`} />
      ))}
    </div>
  );
}

export function OrderProgress({ steps }: { steps: TrackingStep[] }) {
  if (steps.length === 0) return null;
  return (
    <ol aria-label="Order progress" className="m-0 grid list-none gap-0 p-0 px-5 pb-2 pt-7 sm:px-8" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((s, i) => (
        <li key={s.key} aria-current={s.state === "current" ? "step" : undefined} className="flex flex-col gap-2.5">
          <span className="flex items-center">
            <span
              aria-hidden="true"
              className={`box-border h-3.5 w-3.5 shrink-0 rounded-full ${s.state === "todo" ? "border border-[#C9BCA8] bg-white" : "bg-brown"} ${s.state === "current" ? "shadow-[0_0_0_5px_rgba(82,27,10,0.15)]" : ""}`}
            />
            {i < steps.length - 1 ? <span aria-hidden="true" className={`mx-1.5 h-0.5 flex-1 ${s.state === "done" ? "bg-brown" : "bg-line"}`} /> : null}
          </span>
          <span className={`pr-2 text-[13px] leading-snug sm:text-sm ${s.state === "current" ? "font-semibold text-brown" : s.state === "done" ? "font-medium" : "font-light text-muted"}`}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

/** The big card at the top of the overview: where the most recent order is right now. */
export function LatestOrder({ order }: { order: AccountOrder }) {
  const v = order.view;
  return (
    <section aria-label="Latest order" className="border border-line bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold">Latest order · #{v.orderNumber}</span>
          <span className="font-display text-[clamp(26px,3vw,34px)] leading-[1.05]">{v.statusLabel}</span>
          <span className="max-w-[520px] text-[15px] font-light text-body">{v.statusNote}{v.delivery ? ` · ${v.delivery}` : ""}</span>
          {v.tracking ? (
            <span className="text-[14px] font-light text-body">
              {v.tracking.carrier} tracking:{" "}
              {v.tracking.url ? <a href={v.tracking.url} target="_blank" rel="noopener noreferrer" className="text-brown underline">{v.tracking.number}</a> : v.tracking.number}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2.5">
          <Link href={`/track?order=${encodeURIComponent(v.orderNumber)}`} className="label-caps bg-brown px-6 py-4 tracking-[0.18em] text-ivory no-underline">Track order</Link>
          <Link href="/account/orders" className="label-caps flex h-[50px] items-center border border-brown px-5 tracking-[0.18em] text-brown no-underline">All orders</Link>
        </div>
      </div>
      <OrderProgress steps={v.steps} />
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 pb-7 pt-5 sm:px-8">
        <Thumbs urls={order.thumbs} size="md" />
        <span className="text-sm font-light text-body">
          {countLabel(order.itemCount)} · <span className="font-medium text-ink">{money(order)}</span>
        </span>
      </div>
    </section>
  );
}

export function OrderRow({ order }: { order: AccountOrder }) {
  const v = order.view;
  return (
    <div className="flex flex-wrap items-center gap-5 border border-line bg-white px-5 py-6 sm:px-7">
      <Thumbs urls={order.thumbs} size="sm" />
      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
        <span className="font-display text-[21px]">#{v.orderNumber}</span>
        <span className="text-[13px] font-light text-muted">{[orderDate(v.placedAt), countLabel(order.itemCount), money(order)].filter(Boolean).join(" · ")}</span>
        <span className="max-w-[460px] text-[13px] font-light text-body">{v.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}</span>
        {v.tracking ? (
          <span className="text-[13px] font-light text-body">
            {v.tracking.carrier}: {v.tracking.url ? <a href={v.tracking.url} target="_blank" rel="noopener noreferrer" className="text-brown underline">{v.tracking.number}</a> : v.tracking.number}
          </span>
        ) : null}
      </div>
      <StatusChip order={order} />
      <Link href={`/track?order=${encodeURIComponent(v.orderNumber)}`} className="label-caps border border-brown px-[18px] py-[13px] tracking-[0.16em] text-brown no-underline">Track order</Link>
    </div>
  );
}
