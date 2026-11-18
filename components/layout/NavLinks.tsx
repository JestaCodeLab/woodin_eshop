"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { NavList, type NavKey } from "./NavList";

/** Active item comes from /shop?cat=… so pages never have to pass it. */
export function NavLinks({ overlay }: { overlay: boolean }) {
  const pathname = usePathname();
  const cat = useSearchParams().get("cat");
  const active: NavKey | null =
    pathname === "/stores"
      ? "stores"
      : pathname === "/shop" && (cat === "men" || cat === "women" || cat === "fabrics")
        ? cat
        : null;
  return <NavList active={active} overlay={overlay} />;
}
