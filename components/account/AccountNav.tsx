"use client";

import { Heart, House, MapPin, Package, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface AccountNavItem {
  href: string;
  label: string;
  icon: "overview" | "orders" | "favorites" | "addresses" | "details" | "security";
  meta?: string;
}

const ICONS: Record<AccountNavItem["icon"], LucideIcon> = { overview: House, orders: Package, favorites: Heart, addresses: MapPin, details: UserRound, security: ShieldCheck };

/** Sections of the account area. A scrolling tab row on phones, a vertical menu from lg up. */
export function AccountNav({ items }: { items: AccountNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Account sections" className="-mx-[var(--gutter)] flex overflow-x-auto border-b border-line px-[var(--gutter)] lg:mx-0 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-t lg:px-0">
      {items.map(({ href, label, icon, meta }) => {
        const Icon = ICONS[icon];
        const on = href === "/account" ? pathname === "/account" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-12 shrink-0 items-center justify-between gap-6 whitespace-nowrap px-4 text-[15px] no-underline lg:min-h-14 lg:shrink lg:border-b lg:border-line ${
              on
                ? "border-b-2 border-brown font-medium text-brown lg:border-b-line lg:bg-white lg:shadow-[inset_3px_0_0_var(--color-brown)]"
                : "border-b-2 border-transparent font-light text-ink lg:border-b-line"
            }`}
          >
            <span className="flex items-center gap-3.5">
              <Icon size={18} strokeWidth={1.4} aria-hidden="true" className="hidden sm:block" />
              {label}
            </span>
            {meta ? <span className="hidden text-xs text-gold lg:inline">{meta}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
