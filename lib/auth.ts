import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { ordersBase } from "./orders";
import { ordersConfigured } from "./payments-config";

/**
 * Customer sessions: passwordless sign-in with a 6-digit code sent by email.
 *
 * - The code is generated, hashed, rate-limited and emailed by the WordPress mu-plugin
 *   (wordpress/woodin-customer-login.php), so no extra service is needed and guess limits hold
 *   across serverless instances.
 * - After the code checks out, the eshop sets a signed httpOnly cookie holding only the WooCommerce
 *   customer id + email + expiry. Nothing else about the customer is trusted from the browser.
 */

// "__Host-" makes browsers accept the cookie only over HTTPS, for this exact host, with Path=/ and no
// Domain, so a sibling subdomain (e.g. the WordPress site) cannot overwrite or fixate it. It needs
// Secure, so it is production-only (plain http://localhost cannot set Secure cookies).
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-woodin_session" : "woodin_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface Session {
  /** WooCommerce customer id. */
  customerId: number;
  email: string;
  exp: number;
}

function secret(): string | null {
  const s = process.env.SESSION_SECRET?.trim();
  return s && s.length >= 32 ? s : null;
}

function loginSecret(): string | null {
  const s = process.env.WC_LOGIN_SECRET?.trim();
  return s && s.length >= 20 ? s : null;
}

/** Accounts are available only when the session secret, the login secret and the orders site are all set. */
export function accountsEnabled(): boolean {
  return secret() !== null && loginSecret() !== null && ordersConfigured();
}

const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

function encode(session: Session, key: string): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

function decode(value: string, key: string): Session | null {
  const [payload, sig, extra] = value.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<Session>;
    if (!Number.isInteger(s.customerId) || (s.customerId as number) <= 0) return null;
    if (typeof s.email !== "string" || typeof s.exp !== "number" || s.exp * 1000 < Date.now()) return null;
    return s as Session;
  } catch {
    return null;
  }
}

/** The signed-in customer, or null. Reads cookies, so call it behind <Suspense> or in a route handler. */
export async function getSession(): Promise<Session | null> {
  const key = secret();
  if (!key) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  // Checking the expiry compares against the current time. Next refuses unstable values while it
  // prerenders or prefetches a page, so wait until a real request is being served.
  await connection();
  return decode(raw, key);
}

export async function startSession(customerId: number, email: string): Promise<void> {
  const key = secret();
  if (!key) throw new Error("SESSION_SECRET is not set");
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  (await cookies()).set(COOKIE, encode({ customerId, email, exp }, key), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  // Expire it with the SAME attributes it was set with. A "__Host-" cookie is only accepted (and only
  // deleted) by browsers when the response carries Secure and Path=/, which a plain delete() omits.
  (await cookies()).set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

// ---------------------------------------------------------------------------
// Login codes (sent and checked by WordPress)
// ---------------------------------------------------------------------------

export type CodeFailure = "invalid_email" | "too_soon" | "mail_failed" | "unavailable";
export type VerifyFailure = "invalid" | "expired" | "locked" | "wrong" | "unavailable";

async function loginCall(path: "login-code" | "login-verify", body: Record<string, string>): Promise<{ status: number; reason?: string; ok: boolean }> {
  const key = loginSecret();
  if (!key) return { status: 503, ok: false, reason: "unavailable" };
  try {
    const res = await fetch(`${ordersBase()}/?rest_route=/woodin/v1/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Woodin-Secret": key },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
    if (!data || (typeof data.ok !== "boolean")) {
      console.error(`[auth] ${path} answered ${res.status} without a result (is woodin-customer-login.php installed?)`);
      return { status: 502, ok: false, reason: "unavailable" };
    }
    return { status: res.status, ok: data.ok, reason: data.reason };
  } catch (e) {
    console.error(`[auth] ${path} failed:`, e instanceof Error ? e.message : e);
    return { status: 502, ok: false, reason: "unavailable" };
  }
}

export async function requestLoginCode(email: string, ip: string): Promise<{ ok: true } | { ok: false; reason: CodeFailure }> {
  const r = await loginCall("login-code", { email, ip });
  if (r.ok) return { ok: true };
  const known: CodeFailure[] = ["invalid_email", "too_soon", "mail_failed"];
  return { ok: false, reason: known.find((k) => k === r.reason) ?? "unavailable" };
}

export async function verifyLoginCode(email: string, code: string): Promise<{ ok: true } | { ok: false; reason: VerifyFailure }> {
  const r = await loginCall("login-verify", { email, code });
  if (r.ok) return { ok: true };
  const known: VerifyFailure[] = ["invalid", "expired", "locked", "wrong"];
  return { ok: false, reason: known.find((k) => k === r.reason) ?? "unavailable" };
}
