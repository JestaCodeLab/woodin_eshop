"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS, NavList } from "./NavList";

/** Derives the active nav item from the URL so pages never have to pass it. */
export function NavLinks({ overlay }: { overlay: boolean }) {
  const pathname = usePathname();
  const active =
    NAV_ITEMS.find((item) =>
      item.matches.some((m) => pathname === m || pathname.startsWith(`${m}/`)),
    )?.key ?? null;
  return <NavList active={active} overlay={overlay} />;
}
