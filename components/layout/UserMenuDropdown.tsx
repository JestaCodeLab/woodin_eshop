"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/account/SignOutButton";
import { UserIcon } from "@/components/ui/icons";

const LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/favorites", label: "Favourites" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/details", label: "Account details" },
  { href: "/account/security", label: "Security" },
];

/** Signed-in menu in the navbar, after the bag. Closes on outside click, Esc, or when the page changes. */
export function UserMenuDropdown({ email, initials }: { email: string; initials: string }) {
  const pathname = usePathname();
  // Remember WHICH page it was opened on: navigating elsewhere closes it with no effect needed.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpenOn(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label="My account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpenOn(open ? null : pathname)}
        className="flex h-11 items-center gap-1.5 px-2"
      >
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brown font-display text-[13px] leading-none text-ivory">
          {initials}
        </span>
        <ChevronDown size={14} strokeWidth={1.6} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div role="menu" aria-label="My account" className="absolute right-0 top-full z-40 mt-1 w-[260px] border border-line bg-ivory text-ink shadow-[0_12px_32px_rgba(26,18,14,0.14)]">
          <div className="border-b border-line px-4 py-3.5">
            <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Signed in as</span>
            <span className="block truncate text-[14px]">{email}</span>
          </div>
          <div className="flex flex-col py-1.5">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} role="menuitem" className="px-4 py-2.5 text-[15px] font-light text-ink no-underline hover:bg-sand">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-line">
            <SignOutButton variant="menu" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Signed-out state: a plain link to sign in. */
export function SignInLink() {
  return (
    <Link href="/login" aria-label="Sign in" className="flex h-11 w-11 items-center justify-center">
      <UserIcon size={22} />
    </Link>
  );
}
