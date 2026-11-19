"use client";

import { MapPin, Mars, Menu, Newspaper, PackageSearch, Scissors, Venus, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LOGO } from "@/lib/images";
import { shopHref } from "@/lib/links";

const LINKS: { key: string; label: string; href: string; Icon: LucideIcon }[] = [
  { key: "men", label: "Men", href: shopHref("men"), Icon: Mars },
  { key: "women", label: "Women", href: shopHref("women"), Icon: Venus },
  { key: "fabrics", label: "Fabrics", href: shopHref("fabrics"), Icon: Scissors },
  { key: "insights", label: "Insights", href: "/insights", Icon: Newspaper },
  { key: "stores", label: "Find a store", href: "/stores", Icon: MapPin },
  { key: "track", label: "Track your order", href: "/track", Icon: PackageSearch },
];

/**
 * Phone menu: a hamburger that opens a slide-in drawer with the three shop sections and
 * "Find a store". Built on the native <dialog> element, so the browser provides the focus trap,
 * Esc to close, and makes the page behind inert. Hidden from md up (the desktop nav takes over).
 */
export function MobileMenu({ note }: { note: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const cat = useSearchParams().get("cat");

  // Close whenever the route (or the section filter) changes.
  useEffect(() => {
    dialog.current?.close();
  }, [pathname, cat]);

  const active = pathname === "/shop" ? cat : pathname === "/stores" ? "stores" : pathname === "/insights" || pathname.startsWith("/insights/") ? "insights" : pathname === "/track" ? "track" : null;
  const close = () => dialog.current?.close();

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
        className="flex h-11 w-11 items-center justify-center"
      >
        <Menu size={24} strokeWidth={1.5} aria-hidden="true" />
      </button>

      <dialog
        ref={dialog}
        aria-label="Menu"
        onClose={() => setOpen(false)}
        // A click on the backdrop reports the <dialog> itself as the target.
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="woodin-drawer fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(86vw,360px)] max-w-none bg-ivory p-0 text-ink backdrop:bg-ink/50"
      >
        <div className="flex h-full flex-col px-6 pb-8 pt-3">
          <div className="flex items-center justify-between">
            <Link href="/" onClick={close} aria-label="Woodin, Le créateur: shop home" className="block leading-none">
              <Image src={LOGO.brown.src} width={LOGO.brown.width} height={LOGO.brown.height} alt="Woodin Le créateur" className="h-10 w-auto" />
            </Link>
            <button type="button" aria-label="Close menu" onClick={close} className="-mr-3 flex h-11 w-11 items-center justify-center">
              <X size={24} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Menu" className="mt-6 flex flex-col border-t border-line">
            {LINKS.map(({ key, label, href, Icon }) => {
              const on = active === key;
              return (
                <Link
                  key={key}
                  href={href}
                  onClick={close}
                  aria-current={on ? "page" : undefined}
                  // Same type as the desktop nav links: Jost, uppercase, 12px, 0.18em tracking.
                  className={`label-caps flex items-center gap-4 border-b border-line py-5 tracking-[0.18em] no-underline ${on ? "text-brown" : "text-ink"}`}
                >
                  <Icon size={22} strokeWidth={1.5} aria-hidden="true" className={on ? "text-brown" : "text-muted"} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* The announcement bar is hidden on phones; its message lives here instead. */}
          <p className="m-0 mt-auto pt-8 text-xs leading-relaxed tracking-[0.06em] text-muted">{note}</p>
        </div>
      </dialog>
    </div>
  );
}
