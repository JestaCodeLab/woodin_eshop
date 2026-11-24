"use client";

import { LogOut } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Sign out, behind a confirmation. `nav` styles the trigger as a row of the account menu, `menu` as an
 * item of the navbar dropdown. The confirmation is a native modal <dialog>, so the browser handles
 * focus trapping and Esc, and keeps the page behind inert.
 */
export function SignOutButton({ variant = "outline" }: { variant?: "outline" | "nav" | "menu" }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const stay = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (asking && !dialog.current?.open) {
      dialog.current?.showModal();
      // showModal() focuses the first button, which is the destructive one: start on the safe choice instead.
      stay.current?.focus();
    }
  }, [asking]);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => undefined);
    // Full page load on purpose: it clears the bag and favorites held in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  }

  const open = () => setAsking(true);

  const trigger =
    variant === "menu" ? (
      <button type="button" role="menuitem" onClick={open} className="flex w-full items-center gap-2.5 border-0 bg-transparent px-4 py-3 text-left text-[15px] font-light text-brown hover:bg-sand">
        <LogOut size={16} strokeWidth={1.4} aria-hidden="true" />
        Sign out
      </button>
    ) : variant === "nav" ? (
      <button
        type="button"
        onClick={open}
        className="label-caps flex min-h-14 w-full items-center gap-3.5 border-0 border-b border-line bg-transparent px-4 text-left tracking-[0.18em] text-brown"
      >
        <LogOut size={18} strokeWidth={1.4} aria-hidden="true" />
        Sign out
      </button>
    ) : (
      <button type="button" onClick={open} className="label-caps h-11 border border-ink px-5 tracking-[0.14em] text-ink hover:bg-ink hover:text-ivory">
        Sign out
      </button>
    );

  return (
    <>
      {trigger}
      {asking ? (
        <dialog
          ref={dialog}
          aria-labelledby={titleId}
          onClose={() => !busy && setAsking(false)}
          // A click on the backdrop reports the <dialog> itself as the target.
          onClick={(e) => e.target === dialog.current && !busy && dialog.current?.close()}
          className="fixed inset-0 m-auto h-fit w-[min(92vw,420px)] border border-line bg-ivory p-7 text-ink backdrop:bg-ink/50"
        >
          <h2 id={titleId} className="m-0 mb-3 font-display text-[28px] font-normal text-brown">Sign out?</h2>
          <p className="m-0 mb-7 text-[15px] font-light leading-relaxed text-body">
            You will need a new email code to sign in again. Your bag and favourites stay saved on your account.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={signOut}
              disabled={busy}
              className="label-caps h-12 border-0 bg-brown px-6 tracking-[0.16em] text-ivory disabled:opacity-60"
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
            <button
              type="button"
              ref={stay}
              onClick={() => dialog.current?.close()}
              disabled={busy}
              className="label-caps h-12 border border-brown bg-transparent px-6 tracking-[0.16em] text-brown disabled:opacity-60"
            >
              Stay signed in
            </button>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
