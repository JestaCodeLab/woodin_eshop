"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * "Back" that returns to wherever the shopper came from on this site (keeping their filters, sort
 * and scroll position in the shop). With no earlier page on the site (a shared link, a new tab) it
 * goes to `fallbackHref` instead. The href also makes it a normal link without JavaScript.
 */
export function BackLink({ fallbackHref, label = "Back" }: { fallbackHref: string; label?: string }) {
  const router = useRouter();
  return (
    <Link
      href={fallbackHref}
      onClick={(e) => {
        const fromSite = document.referrer.startsWith(window.location.origin) && window.history.length > 1;
        if (!fromSite) return;
        e.preventDefault();
        router.back();
      }}
      className="label-caps inline-flex items-center gap-2 py-2 tracking-[0.16em] text-ink no-underline hover:text-brown"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {label}
    </Link>
  );
}
