import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LOGO } from "@/lib/images";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/placeholder";
import { BagIcon, HeartIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { NavLinks } from "./NavLinks";
import { NavList } from "./NavList";

interface HeaderProps {
  /** `overlay` sits on top of a hero image (white text, transparent). `solid` is the ivory default. */
  variant?: "solid" | "overlay";
  /** Items in the bag. Wired to the cart in step 3. */
  bagCount?: number;
}

const iconBtn =
  "flex h-11 w-11 items-center justify-center border-0 bg-transparent";

export function Header({ variant = "solid", bagCount = 0 }: HeaderProps) {
  const overlay = variant === "overlay";
  const logo = overlay ? LOGO.white : LOGO.brown;

  return (
    <header className={overlay ? "w-full text-white" : "w-full bg-ivory text-ink"}>
      <div className="bg-brown px-4 py-[11px] text-center text-[11px] uppercase tracking-[0.16em] text-ivory md:px-6 md:text-xs">
        Free Accra delivery over {FREE_DELIVERY_THRESHOLD} · Pay with Mobile Money · Click &amp; collect in store
      </div>

      <div className={`border-b ${overlay ? "border-white/30" : "border-line"}`}>
        <div className="content-wrap grid grid-cols-[1fr_auto_1fr] items-center gap-4 pb-1 pt-3 md:pt-4">
          <div className="hidden items-center gap-1 text-xs uppercase tracking-[0.14em] md:flex">
            <button type="button" className="px-2 py-3 uppercase tracking-[0.14em]">
              EN · FR
            </button>
            <Link href="/stores" className="px-2 py-3">
              Find a store
            </Link>
          </div>
          <div className="md:hidden" aria-hidden="true" />

          <Link href="/" aria-label="Woodin, Le créateur — home" className="block leading-none">
            <Image
              src={logo.src}
              width={logo.width}
              height={logo.height}
              alt="Woodin Le créateur"
              priority
              className="h-11 w-auto md:h-[52px]"
            />
          </Link>

          <div className="flex items-center justify-end gap-0.5">
            <button type="button" aria-label="Search" className={iconBtn}>
              <SearchIcon />
            </button>
            <button type="button" aria-label="Wishlist" className={`${iconBtn} hidden xs:flex`}>
              <HeartIcon />
            </button>
            <button type="button" aria-label="Account" className={`${iconBtn} hidden md:flex`}>
              <UserIcon />
            </button>
            <Link
              href="/cart"
              aria-label={`Bag, ${bagCount} ${bagCount === 1 ? "item" : "items"}`}
              className="flex h-11 items-center gap-1.5 px-2 text-[13px] tracking-[0.08em]"
            >
              <BagIcon />({bagCount})
            </Link>
          </div>
        </div>

        {/* Mobile: single scrollable row until the drawer lands in step 5. */}
        <nav
          aria-label="Main"
          className="content-wrap overflow-x-auto pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Suspense fallback={<NavList active={null} overlay={overlay} />}>
            <NavLinks overlay={overlay} />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
