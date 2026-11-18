"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AddItemInput, Cart } from "@/lib/cart/types";

type Status = "loading" | "ready" | "error";

interface CartContextValue {
  cart: Cart | null;
  status: Status;
  /** True while a change is in flight. */
  busy: boolean;
  /** Last error message from the API, cleared by the next successful call. */
  error: string | null;
  add: (input: Pick<AddItemInput, "productId"> & Partial<AddItemInput>) => Promise<Cart | null>;
  setQuantity: (key: string, quantity: number) => Promise<Cart | null>;
  remove: (key: string) => Promise<Cart | null>;
  applyCoupon: (code: string) => Promise<Cart | null>;
  clear: () => Promise<Cart | null>;
}

const CartContext = createContext<CartContextValue | null>(null);

async function call(path: string, body?: unknown): Promise<Cart> {
  const res = await fetch(`/api/cart${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Something went wrong. Please try again.");
  return data as Cart;
}

/** Holds the bag for the whole app. The cookie lives server-side; this only mirrors it. */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    call("")
      .then((c) => {
        if (cancelled) return;
        setCart(c);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  const mutate = useCallback(async (path: string, body: unknown) => {
    setBusy(true);
    try {
      const next = await call(path, body);
      setCart(next);
      setStatus("ready");
      setError(null);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      status,
      busy,
      error,
      add: (input) => mutate("/add-item", { quantity: 1, variation: [], ...input }),
      setQuantity: (key, quantity) => mutate("/update-item", { key, quantity }),
      remove: (key) => mutate("/remove-item", { key }),
      applyCoupon: (code) => mutate("/coupon", { code }),
      clear: () => mutate("/clear", {}),
    }),
    [cart, status, busy, error, mutate],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
