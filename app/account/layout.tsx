import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AccountNav, type AccountNavItem } from "@/components/account/AccountNav";
import { SignOutButton } from "@/components/account/SignOutButton";
import { Header } from "@/components/layout/Header";
import { requireSession } from "@/lib/account";
import { isOnTheWay } from "@/lib/account-orders";
import { customerNames, getAddresses, getCustomer, getFavorites, listOrders, memberSince } from "@/lib/customers";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

async function AccountShell({ children }: { children: ReactNode }) {
  const session = await requireSession();
  // Each part degrades on its own: a slow orders site must not blank the whole area.
  const [customer, orders, favorites] = await Promise.all([
    getCustomer(session.customerId).catch(() => null),
    listOrders(session.customerId).catch(() => null),
    getFavorites(session.customerId).catch(() => null),
  ]);

  const { first, last } = customer ? customerNames(customer) : { first: "", last: "" };
  const greetName = first || session.email.split("@")[0];
  const initials = ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || session.email.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "W";
  const since = customer ? memberSince(customer) : null;
  const addressCount = customer ? getAddresses(customer).length : 0;
  const onTheWay = orders?.filter((o) => isOnTheWay(o.status)).length ?? 0;

  const stats = [
    { value: orders?.length, label: "Orders", href: "/account/orders" },
    { value: favorites?.length, label: "Favourites", href: "/account/favorites" },
    { value: customer ? addressCount : undefined, label: "Addresses", href: "/account/addresses" },
  ];
  const items: AccountNavItem[] = [
    { href: "/account", label: "Overview", icon: "overview" },
    { href: "/account/orders", label: "Orders", icon: "orders", meta: onTheWay ? `${onTheWay} on the way` : "" },
    { href: "/account/favorites", label: "Favourites", icon: "favorites", meta: favorites?.length ? String(favorites.length) : "" },
    { href: "/account/addresses", label: "Addresses", icon: "addresses" },
    { href: "/account/details", label: "Account details", icon: "details" },
  ];

  return (
    <>
      <section className="bg-sand">
        <div className="content-wrap flex flex-wrap items-end justify-between gap-8 pb-10 pt-10 md:pb-12 md:pt-14">
          <div className="flex min-w-0 max-w-full items-center gap-5 md:gap-7">
            <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brown font-display text-[24px] text-ivory md:h-24 md:w-24 md:text-[36px]">
              {initials}
            </span>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="label-caps tracking-[0.28em] text-gold">My account</span>
              <h1 className="m-0 font-display text-[clamp(30px,4.4vw,52px)] font-normal leading-none text-brown">Akwaaba, {greetName}.</h1>
              <span className="truncate text-[15px] font-light text-body">{session.email}{since ? ` · Member since ${since}` : ""}</span>
            </div>
          </div>
          <div className="grid w-full grid-cols-3 gap-2.5 md:flex md:w-auto">
            {stats.map((s) => (
              <Link key={s.label} href={s.href} className="flex min-w-0 flex-col gap-1 border border-line bg-white px-3.5 py-3.5 text-ink no-underline hover:border-brown md:min-w-[150px] md:px-5 md:py-4">
                <span className="font-display text-[30px] leading-none md:text-[34px]">{s.value ?? "–"}</span>
                <span className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted md:text-[11px] md:tracking-[0.18em]">{s.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="content-wrap grid grid-cols-1 gap-8 pb-20 pt-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14 lg:pb-24 lg:pt-12">
        <aside className="flex flex-col gap-6">
          <AccountNav items={items} />
          <div className="hidden lg:block">
            <SignOutButton variant="nav" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col gap-14">{children}</div>
        <div className="lg:hidden">
          <SignOutButton />
        </div>
      </section>
    </>
  );
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<div aria-busy="true" className="content-wrap py-16"><div className="h-96 animate-pulse bg-sand" /></div>}>
          <AccountShell>{children}</AccountShell>
        </Suspense>
      </main>
    </>
  );
}
