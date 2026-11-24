import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignOutButton } from "@/components/account/SignOutButton";
import { Header } from "@/components/layout/Header";
import { ProductCard } from "@/components/product/ProductCard";
import { getSession } from "@/lib/auth";
import { getFavorites, listOrders } from "@/lib/customers";
import { formatMoney } from "@/lib/format";
import { toCardData } from "@/lib/normalize";
import { buildTrackingView } from "@/lib/tracking";
import { getProductById } from "@/lib/woocommerce";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

const SHOWN_FAVORITES = 24;

const dateFmt = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" });

async function AccountContent() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");

  // Each part degrades on its own: a slow orders site should not blank the whole page.
  const [orders, favoriteIds] = await Promise.all([
    listOrders(session.customerId).then((o) => o.map(buildTrackingView)).catch(() => null),
    getFavorites(session.customerId).catch(() => null),
  ]);
  const favorites = favoriteIds
    ? (await Promise.all(favoriteIds.slice(0, SHOWN_FAVORITES).map((id) => getProductById(id).catch(() => null)))).flatMap((p) => (p ? [toCardData(p)] : []))
    : null;

  return (
    <div className="flex flex-col gap-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[clamp(30px,4vw,48px)] font-normal leading-none text-brown">My account</h1>
          <p className="m-0 text-[15px] font-light text-body">Signed in as {session.email}</p>
        </div>
        <SignOutButton />
      </div>

      <section aria-labelledby="orders-h" className="flex flex-col gap-5">
        <h2 id="orders-h" className="m-0 font-display text-[30px] font-normal">Orders</h2>
        {orders === null ? (
          <p className="m-0 text-[15px] text-body">We could not load your orders right now. Please try again in a moment.</p>
        ) : orders.length === 0 ? (
          <p className="m-0 text-[17px] font-light text-body">
            No orders yet. <Link href="/shop" className="text-brown underline">Start shopping</Link>
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {orders.map((o) => (
              <li key={o.orderNumber} className="flex flex-col gap-3 border-t border-line py-6 first:border-t-0 md:flex-row md:justify-between">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[17px]">
                    Order #{o.orderNumber}
                    {o.placedAt ? <span className="font-light text-muted"> · {dateFmt.format(new Date(o.placedAt))}</span> : null}
                  </span>
                  <span className="text-[13px] font-medium uppercase tracking-[0.14em] text-brown">{o.statusLabel}</span>
                  <span className="max-w-[520px] text-[14px] font-light text-body">{o.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}</span>
                  {o.tracking ? (
                    <span className="text-[14px] font-light text-body">
                      {o.tracking.carrier} tracking:{" "}
                      {o.tracking.url ? <a href={o.tracking.url} target="_blank" rel="noopener noreferrer" className="text-brown underline">{o.tracking.number}</a> : o.tracking.number}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-start gap-6 md:flex-col md:items-end md:gap-2">
                  <span className="text-[17px]">{formatMoney(Number(o.total), o.currency)}</span>
                  <Link href={`/track?order=${encodeURIComponent(o.orderNumber)}`} className="text-[13px] text-body underline">Track</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="fav-h" className="flex flex-col gap-5">
        <h2 id="fav-h" className="m-0 font-display text-[30px] font-normal">Favorites</h2>
        {favorites === null ? (
          <p className="m-0 text-[15px] text-body">We could not load your favorites right now.</p>
        ) : favorites.length === 0 ? (
          <p className="m-0 text-[17px] font-light text-body">Tap the heart on any piece to save it here.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {favorites.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AccountPage() {
  return (
    <>
      <Header />
      <main className="content-wrap py-12 md:py-16">
        <Suspense fallback={<div aria-busy="true" className="h-96 animate-pulse bg-sand" />}>
          <AccountContent />
        </Suspense>
      </main>
    </>
  );
}
