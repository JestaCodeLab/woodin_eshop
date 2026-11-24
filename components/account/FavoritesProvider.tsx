"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface FavoritesValue {
  /** Product ids the signed-in customer has saved. */
  ids: ReadonlySet<number>;
  signedIn: boolean;
  /** Saves or removes a product. Guests are sent to sign in first. */
  toggle: (productId: number) => Promise<void>;
}

/** Where to come back to after signing in. Read at click time, so the provider never depends on the URL while prerendering. */
const signInHref = () => `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;

const FavoritesContext = createContext<FavoritesValue | null>(null);

async function post(productId: number, saved: boolean): Promise<number[] | "signed_out" | null> {
  try {
    const res = await fetch("/api/account/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, saved }),
    });
    if (res.status === 401) return "signed_out";
    if (!res.ok) return null;
    return ((await res.json()) as { ids: number[] }).ids;
  } catch {
    return null;
  }
}

/** Mirrors the customer's saved products so every heart on the page knows its state. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ids, setIds] = useState<ReadonlySet<number>>(new Set());
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/favorites", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { signedIn: boolean; ids: number[] } | null) => {
        if (cancelled || !d) return;
        setSignedIn(d.signedIn);
        setIds(new Set(d.ids));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(
    async (productId: number) => {
      if (!signedIn) {
        router.push(signInHref());
        return;
      }
      const before = ids;
      const saved = !before.has(productId);
      // Optimistic: the heart flips at once, then settles to what the server says.
      const optimistic = new Set(before);
      if (saved) optimistic.add(productId);
      else optimistic.delete(productId);
      setIds(optimistic);

      const result = await post(productId, saved);
      if (result === "signed_out") {
        setSignedIn(false);
        setIds(new Set());
        router.push(signInHref());
      } else if (result === null) {
        setIds(before); // could not save: put the heart back
      } else {
        setIds(new Set(result));
      }
    },
    [ids, signedIn, router],
  );

  const value = useMemo(() => ({ ids, signedIn, toggle }), [ids, signedIn, toggle]);
  return <FavoritesContext value={value}>{children}</FavoritesContext>;
}

export function useFavorites(): FavoritesValue {
  const v = useContext(FavoritesContext);
  if (!v) throw new Error("useFavorites must be used inside <FavoritesProvider>");
  return v;
}
