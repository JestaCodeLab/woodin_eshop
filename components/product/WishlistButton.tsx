"use client";

import { useFavorites } from "@/components/account/FavoritesProvider";
import { HeartIcon } from "@/components/ui/icons";

/** Heart toggle on product cards. Saved to the customer's account; guests are sent to sign in. */
export function WishlistButton({ productId, title }: { productId: number; title: string }) {
  const { ids, toggle } = useFavorites();
  const saved = ids.has(productId);
  return (
    <button
      type="button"
      aria-label={saved ? `Remove ${title} from favorites` : `Save ${title} to favorites`}
      aria-pressed={saved}
      onClick={() => void toggle(productId)}
      className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center"
    >
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-ivory text-brown">
        <HeartIcon size={16} fill={saved ? "currentColor" : "none"} />
      </span>
    </button>
  );
}
