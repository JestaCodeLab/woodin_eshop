import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BagLink } from "@/components/cart/BagLink";
import { accountsEnabled } from "@/lib/auth";
import { freeDeliveryLabel } from "@/lib/config";
import { LOGO } from "@/lib/images";
import { MenuIcon } from "@/components/ui/icons";
import { HeaderSearch } from "./HeaderSearch";
import { UserMenu } from "./UserMenu";
import { SignInLink } from "./UserMenuDropdown";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import { NavList } from "./NavList";

interface HeaderProps {
  /** `overlay` sits on top of a hero image (white text, transparent). `solid` is the ivory default. */
  variant?: "solid" | "overlay";
}

const iconBtn = "flex h-11 w-11 items-center justify-center";

export function Header({ variant = "solid" }: HeaderProps) {
  const overlay = variant === "overlay";
  const accounts = accountsEnabled();
  const announcement = `Free Accra delivery over ${freeDeliveryLabel()} · Pay with Mobile Money`;

  return (
    <header className={overlay ? "w-full text-white" : "w-full bg-ivory text-ink"}>
      <div className="hidden bg-brown px-6 py-[11px] text-center text-xs uppercase tracking-[0.16em] text-ivory md:block">
        {announcement}
      </div>

      <div className={`border-b ${overlay ? "border-white/30" : "border-line"}`}>
        <div className="content-wrap grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 md:gap-4 md:pb-1 md:pt-4">
          <div className="flex items-center">
            {/* Phones: hamburger + drawer. md and up: the "Track your order" link and the nav row below. */}
            <Suspense
              fallback={
                <span aria-hidden="true" className={`${iconBtn} md:hidden`}>
                  <MenuIcon size={24} />
                </span>
              }
            >
              <MobileMenu note={announcement} accounts={accounts} />
            </Suspense>
            <Link href="/track" className="hidden items-center px-2 py-3 text-xs uppercase tracking-[0.14em] md:flex">
              Track your order
            </Link>
          </div>

          <Link href="/" aria-label="Woodin, Le créateur: shop home" className="block leading-none">
            {/* The W mark alone at every size (brown, or white over the home page hero). */}
            <Image
              src={LOGO.mark.src}
              width={LOGO.mark.width}
              height={LOGO.mark.height}
              alt="Woodin Le créateur"
              priority
              className={`h-9 w-auto md:h-12 ${overlay ? "brightness-0 invert" : ""}`}
            />
          </Link>

          <div className="flex items-center justify-end gap-0.5">
            {/* Phones keep only the bag here: search and account live in the menu drawer. */}
            <HeaderSearch className={`${iconBtn} max-md:hidden`} />
            <BagLink />
            {/* After the bag: the profile menu. Desktop only; phones have My account in the menu drawer. */}
            {accounts ? (
              <div className="max-md:hidden">
                <Suspense fallback={<SignInLink />}>
                  <UserMenu />
                </Suspense>
              </div>
            ) : null}
          </div>
        </div>

        <nav aria-label="Main" className="content-wrap hidden md:block">
          <Suspense fallback={<NavList active={null} overlay={overlay} />}>
            <NavLinks overlay={overlay} />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
