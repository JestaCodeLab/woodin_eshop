"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/account/Notice";

export interface DeviceRow {
  sid: string;
  label: string;
  ip: string;
  signedIn: string;
  lastUsed: string;
}

async function send(body: unknown): Promise<{ ok: boolean; signedOut?: boolean; message?: string }> {
  try {
    const res = await fetch("/api/account/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as { signedOut?: boolean; message?: string } | null;
    return { ok: res.ok, signedOut: data?.signedOut, message: data?.message };
  } catch {
    return { ok: false, message: "We could not reach the shop. Check your connection and try again." };
  }
}

/** The devices signed in to the account, with the means to sign any of them (or all) out. */
export function SessionsManager({ devices, current }: { devices: DeviceRow[]; current: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, body: unknown) {
    setBusy(key);
    setError(null);
    const r = await send(body);
    setBusy(null);
    if (!r.ok) return setError(r.message ?? "That did not work. Please try again.");
    if (r.signedOut) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
      return;
    }
    router.refresh();
  }

  const others = devices.filter((d) => d.sid !== current).length;

  return (
    <div className="flex flex-col gap-6">
      {error ? <Notice>{error}</Notice> : null}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {devices.map((d) => {
          const here = d.sid === current;
          return (
            <li key={d.sid} className="flex flex-wrap items-center justify-between gap-4 border border-line bg-white px-5 py-5 sm:px-6">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2.5 font-display text-[20px]">
                  {d.label || "Unknown device"}
                  {here ? <span className="bg-brown px-2 py-1 font-text text-[10px] font-semibold uppercase tracking-[0.18em] text-ivory">This device</span> : null}
                </span>
                <span className="text-[13px] font-light text-muted">
                  Signed in {d.signedIn} · Last active {d.lastUsed}
                  {d.ip ? ` · IP ${d.ip}` : ""}
                </span>
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void run(d.sid, { op: "revoke", sid: d.sid })}
                className="label-caps h-11 border border-brown bg-transparent px-5 tracking-[0.16em] text-brown disabled:opacity-60"
              >
                {busy === d.sid ? "Signing out…" : here ? "Sign out here" : "Sign out"}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-3 border-t border-line pt-6">
        {others > 0 ? (
          <button type="button" disabled={busy !== null} onClick={() => void run("others", { op: "revoke_others" })} className="label-caps h-12 border border-brown bg-transparent px-6 tracking-[0.16em] text-brown disabled:opacity-60">
            {busy === "others" ? "Signing out…" : "Sign out all other devices"}
          </button>
        ) : null}
        <button type="button" disabled={busy !== null} onClick={() => void run("all", { op: "revoke_all" })} className="label-caps h-12 border-0 bg-brown px-6 tracking-[0.16em] text-ivory disabled:opacity-60">
          {busy === "all" ? "Signing out…" : "Sign out everywhere"}
        </button>
      </div>
      <p className="m-0 max-w-[560px] text-[13px] font-light leading-relaxed text-muted">
        A device you sign out stays signed in for up to 15 minutes at most, then needs a new code. If you do not recognise a device, sign out everywhere.
      </p>
    </div>
  );
}
