"use client";

import { BadgeCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Notice } from "@/components/account/Notice";

const RESEND_SECONDS = 60;

async function post(path: string, body: unknown): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: res.ok, message: data?.message };
  } catch {
    return { ok: false, message: "We could not reach the shop. Check your connection and try again." };
  }
}

/**
 * Proves the phone number on the account is the customer's own, by a 6-digit text. The number is the one saved
 * on the account (the server never takes a number from the browser). `banner` is the prompt on the overview,
 * `inline` the row on Account details.
 */
export function PhoneVerification({ phone, verified, variant }: { phone: string; verified: boolean; variant: "banner" | "inline" }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justVerified, setJustVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "code") input.current?.focus();
  }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function send() {
    setBusy(true);
    setError(null);
    const r = await post("/api/account/phone/send", {});
    setBusy(false);
    if (!r.ok) return setError(r.message ?? "We could not send the code.");
    setStep("code");
    setCode("");
    setCooldown(RESEND_SECONDS);
  }

  async function confirm(value: string) {
    setBusy(true);
    setError(null);
    const r = await post("/api/account/phone/verify", { code: value });
    setBusy(false);
    if (!r.ok) {
      setCode("");
      input.current?.focus();
      return setError(r.message ?? "That code did not work.");
    }
    setJustVerified(true);
    setStep("idle");
    router.refresh();
  }

  const isVerified = verified || justVerified;

  if (isVerified) {
    return (
      <p className={`m-0 flex items-center gap-2 text-[15px] ${variant === "banner" ? "border border-line bg-white px-5 py-4" : ""}`} role="status">
        <BadgeCheck size={18} strokeWidth={1.6} aria-hidden="true" className="text-instock-dot" />
        <span>
          <span className="font-medium">{phone}</span> <span className="font-light text-body">is verified. Order updates can reach you by text.</span>
        </span>
      </p>
    );
  }

  const body = (
    <div className="flex flex-col gap-4">
      {step === "idle" ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="m-0 max-w-[560px] text-[15px] font-light leading-relaxed text-body">
            {variant === "banner" ? "Verify your phone number " : "This number is not verified yet. "}
            <span className="font-medium text-ink">{phone}</span>
            {variant === "banner" ? " so we can send order updates to the right person. We text you a 6-digit code." : ". We will text you a 6-digit code."}
          </p>
          <button type="button" onClick={() => void send()} disabled={busy} className="label-caps h-12 shrink-0 border-0 bg-brown px-6 tracking-[0.16em] text-ivory disabled:opacity-60">
            {busy ? "Sending…" : "Text me a code"}
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6) void confirm(code);
          }}
          className="flex flex-col gap-3"
        >
          <label htmlFor="phone-code" className="text-[15px] font-light text-body">
            We texted a 6-digit code to <span className="font-medium text-ink">{phone}</span>. It expires in 10 minutes.
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="phone-code"
              ref={input}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              aria-invalid={!!error}
              className="h-[52px] w-[170px] border border-line-strong bg-white px-4 text-center font-display text-[24px] tracking-[0.35em] text-brown focus:border-brown aria-[invalid=true]:border-lowstock"
            />
            <button type="submit" disabled={busy || code.length !== 6} className="label-caps h-[52px] border-0 bg-brown px-6 tracking-[0.16em] text-ivory disabled:opacity-60">
              {busy ? "Checking…" : "Verify"}
            </button>
            <button type="button" onClick={() => void send()} disabled={busy || cooldown > 0} className="border-0 bg-transparent p-0 text-[13px] text-body underline disabled:text-muted disabled:no-underline">
              {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
            </button>
          </div>
          <p className="m-0 text-[13px] font-light text-muted">Never share this code. Woodin will never ask you for it.</p>
        </form>
      )}
      {error ? <Notice>{error}</Notice> : null}
    </div>
  );

  return variant === "banner" ? <section aria-label="Verify your phone" className="border border-line bg-sand px-5 py-5 sm:px-7">{body}</section> : body;
}
