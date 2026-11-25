"use client";

import { MapPin, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/account/EmptyState";
import { Notice } from "@/components/account/Notice";
import { Button } from "@/components/ui/Button";
import type { Address } from "@/lib/customers";

const field = "h-[52px] w-full border border-line-strong bg-white px-3.5 text-[15px] focus:border-brown";
const label = "text-xs font-medium uppercase tracking-[0.14em]";

type Draft = { label: string; name: string; phone: string; address: string; area: string };
const EMPTY: Draft = { label: "", name: "", phone: "", address: "", area: "" };

async function send(body: unknown): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch("/api/account/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: res.ok, message: data?.message };
  } catch {
    return { ok: false, message: "We could not reach the shop. Check your connection and try again." };
  }
}

/** The address book: add, edit, remove, choose the default. The server saves it on the customer's WooCommerce account. */
export function AddressesManager({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [removing, setRemoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(a?: Address) {
    setError(null);
    setRemoving(null);
    setDraft(a ? { label: a.label, name: a.name, phone: a.phone, address: a.address, area: a.area } : EMPTY);
    setEditing(a ? a.id : "new");
  }

  async function run(body: unknown, done?: () => void) {
    setBusy(true);
    setError(null);
    const r = await send(body);
    setBusy(false);
    if (!r.ok) return setError(r.message ?? "That did not work. Please try again.");
    done?.();
    router.refresh();
  }

  function save(ev: React.FormEvent) {
    ev.preventDefault();
    void run(editing === "new" ? { op: "add", address: draft } : { op: "update", id: editing, address: draft }, () => setEditing(null));
  }

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <div className="flex flex-col gap-6">
      {error && editing === null ? <Notice>{error}</Notice> : null}

      {addresses.length === 0 && editing === null ? (
        <EmptyState icon={MapPin} title="No addresses saved" action={{ label: "Add an address", onClick: () => open() }}>
          Save an address and checkout fills it in for you, so ordering takes a few taps.
        </EmptyState>
      ) : null}

      <div className={`grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5 ${addresses.length === 0 ? "hidden" : ""}`}>
        {addresses.map((a) => (
          <div key={a.id} className={`flex flex-col gap-2.5 border bg-white p-[26px] ${a.isDefault ? "border-brown" : "border-line"}`}>
            {a.isDefault ? <span className="self-start bg-brown px-[9px] py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ivory">Default</span> : null}
            <span className={`font-display text-[22px] ${a.isDefault ? "" : "mt-[26px]"}`}>{a.label}</span>
            <span className="text-[15px] font-light leading-relaxed text-body">
              {a.name}
              <br />
              {a.address}
              {a.area ? <><br />{a.area}</> : null}
              <br />
              {a.phone}
            </span>
            {removing === a.id ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[13px]">
                <span>Remove this address?</span>
                <button type="button" disabled={busy} onClick={() => void run({ op: "remove", id: a.id }, () => setRemoving(null))} className="border-0 bg-transparent p-0 text-lowstock underline">Yes, remove</button>
                <button type="button" onClick={() => setRemoving(null)} className="border-0 bg-transparent p-0 underline">Cancel</button>
              </div>
            ) : (
              <span className="mt-1.5 flex flex-wrap gap-x-[18px] gap-y-1 text-[13px]">
                <button type="button" onClick={() => open(a)} className="min-h-8 border-0 bg-transparent p-0 text-ink underline">Edit</button>
                <button type="button" onClick={() => { setError(null); setEditing(null); setRemoving(a.id); }} className="min-h-8 border-0 bg-transparent p-0 text-ink underline">Remove</button>
                {!a.isDefault ? (
                  <button type="button" disabled={busy} onClick={() => void run({ op: "default", id: a.id })} className="min-h-8 border-0 bg-transparent p-0 text-ink underline">Set as default</button>
                ) : null}
              </span>
            )}
          </div>
        ))}

        {editing === null && addresses.length < 10 ? (
          <button type="button" onClick={() => open()} className="flex min-h-[240px] flex-col items-center justify-center gap-2.5 border border-dashed border-[#C9BCA8] bg-transparent text-brown">
            <Plus size={30} strokeWidth={1.2} aria-hidden="true" />
            <span className="label-caps tracking-[0.18em]">Add an address</span>
          </button>
        ) : null}
      </div>

      {editing !== null ? (
        <form onSubmit={save} className="flex max-w-[720px] flex-col gap-5 border border-line bg-white p-6 sm:p-8" aria-label={editing === "new" ? "New address" : "Edit address"}>
          <h2 className="m-0 font-display text-[26px] font-normal">{editing === "new" ? "Add an address" : "Edit address"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5"><label htmlFor="addr-label" className={label}>Name this address</label><input id="addr-label" required maxLength={30} placeholder="Home, Office…" value={draft.label} onChange={set("label")} className={field} /></div>
            <div className="flex flex-col gap-1.5"><label htmlFor="addr-name" className={label}>Full name</label><input id="addr-name" required autoComplete="name" value={draft.name} onChange={set("name")} className={field} /></div>
            <div className="flex flex-col gap-1.5"><label htmlFor="addr-phone" className={label}>Phone number</label><input id="addr-phone" required type="tel" autoComplete="tel" placeholder="024 000 0000" value={draft.phone} onChange={set("phone")} className={field} /></div>
            <div className="flex flex-col gap-1.5"><label htmlFor="addr-address" className={label}>Address or GhanaPostGPS</label><input id="addr-address" required autoComplete="street-address" placeholder="e.g. GA-123-4567" value={draft.address} onChange={set("address")} className={field} /></div>
            <div className="flex flex-col gap-1.5 sm:col-span-2"><label htmlFor="addr-area" className={label}>Area / landmark (optional)</label><input id="addr-area" placeholder="e.g. Near Osu Castle" value={draft.area} onChange={set("area")} className={field} /></div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save address"}</Button>
            <Button type="button" variant="outline-brown" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
          </div>
          {error ? <Notice>{error}</Notice> : null}
        </form>
      ) : null}
    </div>
  );
}
