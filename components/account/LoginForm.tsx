"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Notice } from "@/components/account/Notice";
import { TurnstileWidget } from "@/components/account/TurnstileWidget";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CheckIcon } from "@/components/ui/icons";

const field = "h-[56px] w-full border border-line-strong bg-white px-4 text-[16px] transition-colors focus:border-brown";
const label = "label-caps tracking-[0.14em]";
const CODE_LENGTH = 6;
const RESEND_SECONDS = 45;

type Mode = "login" | "register";

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

const PERKS = ["Follow every order, with Ghana Post tracking", "Keep favorites on any device", "Your bag is saved when you sign in", "Faster checkout with saved details"];

/** Sign in or create an account: details, then the 6-digit code that was emailed. No password. */
export function LoginForm({ enabled, siteKey }: { enabled: boolean; siteKey: string | null }) {
  const params = useSearchParams();
  const nextParam = params.get("next");
  const [mode, setMode] = useState<Mode>(params.get("mode") === "register" ? "register" : "login");
  const [step, setStep] = useState<"details" | "code">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [askCaptcha, setAskCaptcha] = useState(false); // resend needs a fresh check
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const [focusTick, setFocusTick] = useState(0);

  // Cursor into the first box when the code step appears or is reset after a wrong code.
  useEffect(() => {
    if (step === "code") boxes.current[0]?.focus();
  }, [step, focusTick]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!enabled) {
    return <p className="m-0 text-[17px] font-light text-body">Accounts are not available yet. You can still check out as a guest.</p>;
  }

  const needsCaptcha = siteKey !== null;
  const register = mode === "register";

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setToken(null);
    setCaptchaKey((k) => k + 1);
  }

  async function sendCode(captcha: string | null) {
    setBusy(true);
    setError(null);
    const r = await post("/api/auth/request", { mode, email, name: register ? name : undefined, phone: register ? phone : undefined, turnstile: captcha });
    setBusy(false);
    // A token is single-use: whatever happened, get a new one for the next try.
    setToken(null);
    setCaptchaKey((k) => k + 1);
    setAskCaptcha(false);
    if (!r.ok) return setError(r.message ?? "We could not send your code.");
    setStep("code");
    setCooldown(RESEND_SECONDS);
    setDigits(Array(CODE_LENGTH).fill(""));
    setFocusTick((t) => t + 1);
  }

  function submitDetails(ev: React.FormEvent) {
    ev.preventDefault();
    if (needsCaptcha && !token) return setError("Please complete the check below the form first.");
    void sendCode(token);
  }

  async function verify(code: string) {
    setBusy(true);
    setError(null);
    const r = await post("/api/auth/verify", { mode, email, code, name: register ? name : undefined, phone: register ? phone : undefined });
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
    boxes.current[Math.min(from + chars.length, CODE_LENGTH - 1)]?.focus();
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

  const heading = (
    <div className="flex flex-col gap-4">
      <Eyebrow>My account</Eyebrow>
      <h1 className="m-0 font-display text-[clamp(32px,4vw,48px)] font-normal leading-none text-brown">{register ? "Create your account" : "Sign in"}</h1>
      <p className="m-0 text-[17px] font-light leading-relaxed text-body">
        {register ? "A few details, then we email you a code to confirm your address. No password to remember." : "We email you a code, so there is no password to remember."}
      </p>
    </div>
  );

  if (step === "details") {
    return (
      <div className="flex flex-col gap-8">
        {heading}
        <form onSubmit={submitDetails} className="flex flex-col gap-4">
          {register ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="reg-name" className={label}>Full name</label>
              <input id="reg-name" name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Ama Mensah" value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <label htmlFor="login-email" className={label}>Email address</label>
            <input id="login-email" type="email" name="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </div>
          {register ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="reg-phone" className={label}>Phone number</label>
              <input id="reg-phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="024 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
              <span className="text-[13px] font-light text-muted">For delivery and order updates by SMS.</span>
            </div>
          ) : null}

          {needsCaptcha ? <TurnstileWidget siteKey={siteKey} onToken={setToken} resetKey={captchaKey} /> : null}

          <Button type="submit" size="lg" disabled={busy || !email || (needsCaptcha && !token)}>
            {busy ? "Sending your code…" : register ? "Create account" : "Email me a code"}
          </Button>
          {error ? <Notice>{error}</Notice> : null}

          <p className="m-0 text-center text-[15px] font-light text-body">
            {register ? "Already have an account? " : "New to Woodin? "}
            <button type="button" onClick={() => switchMode(register ? "login" : "register")} className="border-0 bg-transparent p-0 text-brown underline">
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>
        </form>

        {!register ? (
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
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {heading}
      <div className="flex flex-col gap-6">
        <p role="status" className="m-0 text-[16px] font-light leading-relaxed text-body">
          {register ? "We emailed a 6-digit code to " : "If there is an account for "}
          <strong className="font-medium text-ink">{email}</strong>
          {register ? ". It expires in 10 minutes." : ", we have emailed it a 6-digit code. It expires in 10 minutes."}
        </p>

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

        {askCaptcha && needsCaptcha ? (
          <div className="flex flex-col gap-3">
            <span className="text-[14px] font-light text-body">Quick check, then we send a new code:</span>
            <TurnstileWidget siteKey={siteKey} resetKey={captchaKey} onToken={(t) => t && void sendCode(t)} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-5 text-[13px]">
          <button
            type="button"
            onClick={() => (needsCaptcha ? setAskCaptcha(true) : void sendCode(null))}
            disabled={busy || cooldown > 0 || askCaptcha}
            className="border-0 bg-transparent p-0 text-body underline disabled:text-muted disabled:no-underline"
          >
            {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setError(null);
              setAskCaptcha(false);
            }}
            disabled={busy}
            className="border-0 bg-transparent p-0 text-body underline"
          >
            Use a different email
          </button>
        </div>
        <p className="m-0 text-[13px] font-light text-muted">Cannot find it? Check your spam folder. Never share this code: Woodin will never ask you for it.</p>
      </div>
    </div>
  );
}
