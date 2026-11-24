"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/account/Notice";
import { Button } from "@/components/ui/Button";

const field = "h-[52px] w-full border border-line-strong bg-white px-3.5 text-[15px] focus:border-brown";
const label = "text-xs font-medium uppercase tracking-[0.14em]";

/** Name and phone. The email is how they sign in, so it is shown but cannot be edited. */
export function ProfileForm({ initial }: { initial: { firstName: string; lastName: string; phone: string; email: string } }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: v.firstName, lastName: v.lastName, phone: v.phone }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) setMsg({ tone: "error", text: data?.message ?? "We could not save that. Please try again." });
      else {
        setMsg({ tone: "success", text: "Your details are saved." });
        router.refresh();
      }
    } catch {
      setMsg({ tone: "error", text: "We could not reach the shop. Check your connection and try again." });
    }
    setBusy(false);
  }

  const on = (k: "firstName" | "lastName" | "phone") => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  return (
    <form onSubmit={submit} className="flex max-w-[720px] flex-col gap-6">
      <div className="grid gap-[18px] sm:grid-cols-2">
        <div className="flex flex-col gap-1.5"><label htmlFor="ad-first" className={label}>First name</label><input id="ad-first" required autoComplete="given-name" value={v.firstName} onChange={on("firstName")} className={field} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="ad-last" className={label}>Last name</label><input id="ad-last" autoComplete="family-name" value={v.lastName} onChange={on("lastName")} className={field} /></div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ad-email" className={label}>Email</label>
          <input id="ad-email" type="email" value={v.email} readOnly aria-describedby="ad-email-note" className={`${field} bg-sand text-body`} />
          <span id="ad-email-note" className="text-[13px] font-light text-muted">This is how you sign in, so it cannot be changed here.</span>
        </div>
        <div className="flex flex-col gap-1.5"><label htmlFor="ad-phone" className={label}>Phone (for MoMo &amp; delivery)</label><input id="ad-phone" type="tel" autoComplete="tel" placeholder="024 000 0000" value={v.phone} onChange={on("phone")} className={field} /></div>
      </div>
      <div className="flex flex-col items-start gap-4">
        <Button type="submit" size="lg" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      </div>
    </form>
  );
}
