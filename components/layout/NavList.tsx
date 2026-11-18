import Link from "next/link";
import { MAIN_LINKS, isExternal, shopHref } from "@/lib/links";

export type NavKey = "men" | "women" | "fabrics" | "stores";

/** Eshop header: exactly these four. Stores lives on the main site, so it links out. */
export const NAV_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: "men", label: "Men", href: shopHref("men") },
  { key: "women", label: "Women", href: shopHref("women") },
  { key: "fabrics", label: "Fabrics", href: shopHref("fabrics") },
  { key: "stores", label: "Stores", href: MAIN_LINKS.stores },
];

/** Presentational nav row. Pure (no hooks), so it also serves as the Suspense fallback. */
export function NavList({ active, overlay }: { active: NavKey | null; overlay: boolean }) {
  return (
    <ul className="m-0 flex list-none items-center justify-center gap-x-8 p-0 md:gap-x-[44px]">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active;
        const tone = overlay
          ? isActive
            ? "border-white text-white"
            : "border-transparent text-white"
          : isActive
            ? "border-brown text-brown"
            : "border-transparent text-ink";
        const cls = `label-caps inline-block border-b pb-3 pt-3.5 tracking-[0.18em] no-underline ${tone}`;
        return (
          <li key={item.key}>
            {isExternal(item.href) ? (
              <a href={item.href} className={cls}>
                {item.label}
              </a>
            ) : (
              <Link href={item.href} aria-current={isActive ? "page" : undefined} className={cls}>
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
