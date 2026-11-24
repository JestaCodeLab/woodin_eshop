"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

/** Signs out and reloads the site. `nav` styles it as a row of the account menu. */
export function SignOutButton({ variant = "outline" }: { variant?: "outline" | "nav" | "menu" }) {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => undefined);
    // Full page load on purpose: it clears the bag and favorites held in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  }
  if (variant === "menu") {
    return (
      <button type="button" role="menuitem" onClick={signOut} disabled={busy} className="flex w-full items-center gap-2.5 border-0 bg-transparent px-4 py-3 text-left text-[15px] font-light text-brown hover:bg-sand disabled:opacity-60">
        <LogOut size={16} strokeWidth={1.4} aria-hidden="true" />
        {busy ? "Signing out…" : "Sign out"}
      </button>
    );
  }
  if (variant === "nav") {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="label-caps flex min-h-14 w-full items-center gap-3.5 border-0 border-b border-line bg-transparent px-4 text-left tracking-[0.18em] text-brown disabled:opacity-60"
      >
        <LogOut size={18} strokeWidth={1.4} aria-hidden="true" />
        {busy ? "Signing out…" : "Sign out"}
      </button>
    );
  }
  return (
    <button type="button" onClick={signOut} disabled={busy} className="label-caps h-11 border border-ink px-5 tracking-[0.14em] text-ink hover:bg-ink hover:text-ivory disabled:opacity-60">
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
