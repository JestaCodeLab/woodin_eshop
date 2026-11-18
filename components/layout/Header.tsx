import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BagLink } from "@/components/cart/BagLink";
import { PinIcon, SearchIcon } from "@/components/ui/icons";
import { freeDeliveryLabel } from "@/lib/config";
import { LOGO } from "@/lib/images";
import { NavLinks } from "./NavLinks";
import { NavList } from "./NavList";

interface HeaderProps {
  /** `overlay` sits on top of a hero image (white text, transparent). `solid` is the ivory default. */
  variant?: "solid" | "overlay";
}

const iconBtn = "flex h-11 w-11 items-center justify-center";

export function Header({ variant = "solid" }: HeaderProps) {
  const overlay = variant === "overlay";
  const logo = overlay ? LOGO.white : LOGO.brown;

  return (
    <header className={overlay ? "w-full text-white" : "w-full bg-ivory text-ink"}>
      <div className="bg-brown px-4 py-[11px] text-center text-[11px] uppercase tracking-[0.16em] text-ivory md:px-6 md:text-xs">
        Free Accra delivery over {freeDeliveryLabel()} · Pay with Mobile Money · Click &amp; collect in store
      </div>

      <div className={`border-b ${overlay ? "border-white/30" : "border-line"}`}>
        <div className="content-wrap grid grid-cols-[1fr_auto_1fr] items-center gap-4 pb-1 pt-3 md:pt-4">
          <div className="flex items-center">
            <Link href="/stores" className="hidden items-center px-2 py-3 text-xs uppercase tracking-[0.14em] md:flex">
              Find a store
            </Link>
            <Link href="/stores" aria-label="Find a store" className={`${iconBtn} md:hidden`}>
              <PinIcon />
            </Link>
          </div>

          <Link href="/" aria-label="Woodin, Le créateur: shop home" className="block leading-none">
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
            <Link href="/shop#search" aria-label="Search the shop" className={iconBtn}>
              <SearchIcon />
            </Link>
            <BagLink />
          </div>
        </div>

        <nav aria-label="Main" className="content-wrap">
          <Suspense fallback={<NavList active={null} overlay={overlay} />}>
            <NavLinks overlay={overlay} />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
