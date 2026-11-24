"use client";

import { CheckIcon } from "@/components/ui/icons";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const field = "h-[56px] w-full border border-line-strong bg-white px-4 text-[16px] transition-colors focus:border-brown";
const label = "label-caps tracking-[0.14em]";
const CODE_LENGTH = 6;
const RESEND_SECONDS = 45;

/**
 * Only same-site paths. Browsers delete tabs and newlines inside a URL before parsing it, so
 * "/\t/evil.com" would become "//evil.com". Rather than pattern-match, resolve the value against
 * our own origin and require that it stays there; control characters and backslashes are refused outright.
 */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(raw)) return "/account";
  try {
    const u = new URL(raw, window.location.origin);
    if (u.origin !== window.location.origin) return "/account";
    // Dot-segments can normalise into a protocol-relative URL ("/..//evil.com" -> "//evil.com"): check the result too.
    const out = u.pathname + u.search + u.hash;
    return out.startsWith("/") && !out.startsWith("//") ? out : "/account";
  } catch {
    return "/account";
  }
}

async function post(path: string, body: unknown): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: res.ok, message: data?.message };
  } catch {
    return { ok: false, message: "We could not reach the shop. Check your connection and try again." };
  }
}

/** Rendered only when there is a message, so it never reserves empty space in the form. */
function Notice({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "info" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`m-0 border-l-2 bg-white px-4 py-3 text-[14px] leading-snug ${tone === "error" ? "border-lowstock text-lowstock" : "border-gold-btn text-body"}`}
    >
      {children}
    </p>
  );
}

const PERKS = ["Follow every order, with Ghana Post tracking", "Keep favorites on any device", "Your bag is saved when you sign in", "Faster checkout with saved details"];

/** Two steps: email, then the 6-digit code that was emailed. No password. */
export function LoginForm({ enabled }: { enabled: boolean }) {
  const nextParam = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  // Puts the cursor in the first box whenever the code step appears or is reset (after a wrong code).
  // An effect, not a timeout: it runs after React has rendered the boxes.
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    if (step === "code") boxes.current[0]?.focus();
  }, [step, focusTick]);

  // Resend countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!enabled) {
    return <p className="m-0 text-[17px] font-light text-body">Accounts are not available yet. You can still check out as a guest.</p>;
  }

  async function sendCode(ev?: React.FormEvent) {
    ev?.preventDefault();
    setBusy(true);
    setError(null);
    const r = await post("/api/auth/request", { email });
    setBusy(false);
    if (!r.ok) return setError(r.message ?? "We could not send your code.");
    setStep("code");
    setCooldown(RESEND_SECONDS);
    setDigits(Array(CODE_LENGTH).fill(""));
    setFocusTick((t) => t + 1);
  }

  async function verify(code: string) {
    setBusy(true);
    setError(null);
    const r = await post("/api/auth/verify", { email, code });
    if (!r.ok) {
      setBusy(false);
      setError(r.message ?? "That code did not work.");
      setDigits(Array(CODE_LENGTH).fill(""));
      setFocusTick((t) => t + 1);
      return;
    }
    setDone(true);
    // A full load, so the bag and favorites reload for the signed-in customer.
    window.location.assign(safeNext(nextParam));
  }

  /** Writes digits starting at box `from` (typing one, or pasting many) and submits once all six are in. */
  function fill(from: number, raw: string) {
    const chars = raw.replace(/\D/g, "").slice(0, CODE_LENGTH - from).split("");
    if (chars.length === 0) return;
    const next = [...digits];
    chars.forEach((c, k) => (next[from + k] = c));
    setDigits(next);
    const at = Math.min(from + chars.length, CODE_LENGTH - 1);
    boxes.current[at]?.focus();
    if (next.every(Boolean) && !busy) void verify(next.join(""));
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) next[i] = "";
      else if (i > 0) {
        next[i - 1] = "";
        boxes.current[i - 1]?.focus();
      }
      setDigits(next);
    } else if (e.key === "ArrowLeft" && i > 0) boxes.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) boxes.current[i + 1]?.focus();
  }

  if (step === "email") {
    return (
      <div className="flex flex-col gap-8">
        <form onSubmit={sendCode} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="login-email" className={label}>Email address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </div>
          <Button type="submit" size="lg" disabled={busy || !email}>{busy ? "Sending your code…" : "Email me a code"}</Button>
          {error ? <Notice>{error}</Notice> : null}
          <p className="m-0 text-[13px] font-light leading-relaxed text-muted">
            New here? Just enter your email. We create your account when you confirm the code.
          </p>
        </form>

        <ul className="m-0 flex list-none flex-col gap-3 border-t border-line p-0 pt-7">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-3 text-[14px] font-light text-body">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sand text-brown">
                <CheckIcon size={12} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="m-0 text-[16px] font-light leading-relaxed text-body">
        We emailed a 6-digit code to <strong className="font-medium text-ink">{email}</strong>. It expires in 10 minutes.
      </p>

      {/* min-w-0: a fieldset defaults to min-content width, which would let six inputs push it past the screen. */}
      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={busy}>
        <legend className={`${label} mb-3 p-0`}>Enter your code</legend>
        <div className="flex gap-2 sm:gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              value={d}
              onChange={(e) => fill(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={(e) => {
                e.preventDefault();
                fill(0, e.clipboardData.getData("text"));
              }}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
              aria-invalid={!!error}
              className="h-[60px] w-0 min-w-0 flex-1 border border-line-strong bg-white p-0 text-center font-display text-[28px] text-brown transition-colors focus:border-brown aria-[invalid=true]:border-lowstock"
            />
          ))}
        </div>
      </fieldset>

      {error ? <Notice>{error}</Notice> : done ? <Notice tone="info">Signing you in…</Notice> : busy ? <Notice tone="info">Checking your code…</Notice> : null}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-5 text-[13px]">
        <button
          type="button"
          onClick={() => void sendCode()}
          disabled={busy || cooldown > 0}
          className="border-0 bg-transparent p-0 text-body underline disabled:text-muted disabled:no-underline"
        >
          {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setError(null);
          }}
          disabled={busy}
          className="border-0 bg-transparent p-0 text-body underline"
        >
          Use a different email
        </button>
      </div>
      <p className="m-0 text-[13px] font-light text-muted">Cannot find it? Check your spam folder.</p>
    </div>
  );
}
