"use client";

import Link from "next/link";
import { BagIcon } from "@/components/ui/icons";
import { useCart } from "./CartProvider";

/** Header bag link with the live item count. */
export function BagLink() {
  const { cart } = useCart();
  const count = cart?.itemCount ?? 0;
  return (
    <Link
      href="/cart"
      aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
      className="flex h-11 items-center gap-1.5 px-2 text-[13px] tracking-[0.08em]"
    >
      <BagIcon />({count})
    </Link>
  );
}
