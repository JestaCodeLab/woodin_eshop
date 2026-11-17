"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/ui/icons";

/**
 * Heart toggle on product cards. Local state only: the pitch has no wishlist backend.
 * TODO: persist (localStorage or WC wishlist plugin), see TODO.md.
 */
export function WishlistButton({ title }: { title: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Save ${title} to wishlist`}
      aria-pressed={saved}
      onClick={() => setSaved((s) => !s)}
      className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center"
    >
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-ivory text-brown">
        <HeartIcon size={16} fill={saved ? "currentColor" : "none"} />
      </span>
    </button>
  );
}
