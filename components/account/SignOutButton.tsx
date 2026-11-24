"use client";

import { useState } from "react";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => undefined);
    // Full page load on purpose: it clears the bag and favorites held in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  }
  return (
    <button type="button" onClick={signOut} disabled={busy} className="label-caps h-11 border border-ink px-5 tracking-[0.14em] text-ink hover:bg-ink hover:text-ivory disabled:opacity-60">
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
