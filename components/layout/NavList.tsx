import Link from "next/link";

export type NavKey = "rtw" | "fabrics" | "shop" | "lookbook" | "insights" | "stores";

export const NAV_ITEMS: { key: NavKey; label: string; href: string; matches: string[] }[] = [
  // The product page lives under Ready To Wear in the design (active = "rtw").
  { key: "rtw", label: "Ready To Wear", href: "/ready-to-wear", matches: ["/ready-to-wear", "/product"] },
  { key: "fabrics", label: "Fabrics", href: "/fabrics", matches: ["/fabrics"] },
  { key: "shop", label: "Shop", href: "/shop", matches: ["/shop"] },
  { key: "lookbook", label: "Lookbook", href: "/lookbook", matches: ["/lookbook"] },
  { key: "insights", label: "Insights", href: "/insights", matches: ["/insights"] },
  { key: "stores", label: "Stores", href: "/stores", matches: ["/stores"] },
];

/** Presentational nav row. Pure (no hooks), so it also serves as the Suspense fallback. */
export function NavList({ active, overlay }: { active: NavKey | null; overlay: boolean }) {
  return (
    <ul className="m-0 flex list-none items-center gap-x-6 gap-y-1 p-0 md:flex-wrap md:justify-center md:gap-x-[34px]">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active;
        const tone = overlay
          ? isActive
            ? "border-white text-white"
            : "border-transparent text-white"
          : isActive
            ? "border-brown text-brown"
            : "border-transparent text-ink";
        return (
          <li key={item.key} className="shrink-0">
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`label-caps inline-block border-b pb-3 pt-3.5 font-medium tracking-[0.18em] no-underline md:pt-3.5 ${tone}`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
