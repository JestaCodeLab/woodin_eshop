/**
 * Calls to the WordPress login plugin (wordpress/woodin-customer-login.php). NO "server-only" import: the proxy
 * uses refreshSession() too. Every call carries the shared secret (WC_LOGIN_SECRET).
 */
import { ordersBase } from "./wp-base";

function loginSecret(): string | null {
  const s = process.env.WC_LOGIN_SECRET?.trim();
  return s && s.length >= 20 ? s : null;
}

export const loginSecretConfigured = () => loginSecret() !== null;

type Reply = { status: number; data: Record<string, unknown> | null };

async function call(path: string, body: Record<string, unknown>, timeoutMs = 20_000): Promise<Reply | null> {
  const key = loginSecret();
  if (!key) return null;
  try {
    const res = await fetch(`${ordersBase()}/?rest_route=/woodin/v1/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Woodin-Secret": key },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!data || typeof data.ok !== "boolean") {
      console.error(`[auth] ${path} answered ${res.status} without a result (is woodin-customer-login.php installed?)`);
      return null;
    }
    return { status: res.status, data };
  } catch (e) {
    console.error(`[auth] ${path} failed:`, e instanceof Error ? e.message : e);
    return null;
  }
}

// --- Codes ------------------------------------------------------------------

/**
 * Asks WordPress to email a code. "login" only ever reaches existing customers; "register" reaches the address
 * being registered. The answer never says whether an email was sent (that would reveal who has an account).
 */
export async function requestLoginCode(email: string, ip: string, purpose: "login" | "register"): Promise<"ok" | "rate_limited" | "unavailable"> {
  const r = await call("login-code", { email, ip, purpose });
  if (!r) return "unavailable";
  if (r.status === 429) return "rate_limited";
  return r.data?.ok ? "ok" : "unavailable";
}

export type VerifyFailure = "invalid" | "expired" | "locked" | "wrong" | "unavailable";
export async function verifyLoginCode(email: string, code: string): Promise<{ ok: true } | { ok: false; reason: VerifyFailure }> {
  const r = await call("login-verify", { email, code });
  if (!r) return { ok: false, reason: "unavailable" };
  if (r.data?.ok) return { ok: true };
  const known: VerifyFailure[] = ["invalid", "expired", "locked", "wrong"];
  return { ok: false, reason: known.find((k) => k === r.data?.reason) ?? "unavailable" };
}

// --- Phone verification -----------------------------------------------------

/** WordPress makes and stores the code (hashed) and hands it back so the shop can text it. */
export async function requestPhoneCode(customerId: number, phone: string, ip: string): Promise<{ ok: true; code: string } | { ok: false; reason: "rate_limited" | "invalid_phone" | "unavailable" }> {
  const r = await call("phone-code", { customer_id: customerId, phone, ip });
  if (!r) return { ok: false, reason: "unavailable" };
  if (r.status === 429) return { ok: false, reason: "rate_limited" };
  if (r.data?.reason === "invalid_phone") return { ok: false, reason: "invalid_phone" };
  return r.data?.ok && typeof r.data.code === "string" ? { ok: true, code: r.data.code } : { ok: false, reason: "unavailable" };
}

export async function verifyPhoneCode(customerId: number, phone: string, code: string): Promise<{ ok: true } | { ok: false; reason: VerifyFailure }> {
  const r = await call("phone-verify", { customer_id: customerId, phone, code });
  if (!r) return { ok: false, reason: "unavailable" };
  if (r.data?.ok) return { ok: true };
  const known: VerifyFailure[] = ["invalid", "expired", "locked", "wrong"];
  return { ok: false, reason: known.find((k) => k === r.data?.reason) ?? "unavailable" };
}

// --- Sessions ---------------------------------------------------------------

export async function createSession(input: { customerId: number; uaKey: string; uaLabel: string; ip: string; welcome?: boolean }): Promise<{ sid: string; refresh: string } | null> {
  const r = await call("session-create", { customer_id: input.customerId, ua_coarse: input.uaKey, ua_label: input.uaLabel, ip: input.ip, notify: true, welcome: input.welcome === true });
  if (!r?.data?.ok || typeof r.data.sid !== "string" || typeof r.data.refresh !== "string") return null;
  return { sid: r.data.sid, refresh: r.data.refresh };
}

export type RefreshResult =
  | { ok: true; rotated: boolean; customerId: number; email: string; sid: string; refresh?: string }
  | { ok: false; reason: "invalid" | "reuse" | "device_changed" | "unavailable" };

/** Used by the proxy, so it must not hang a page load: short timeout. */
export async function refreshSession(refresh: string, uaKey: string): Promise<RefreshResult> {
  const r = await call("session-refresh", { refresh, ua_coarse: uaKey }, 10_000);
  if (!r) return { ok: false, reason: "unavailable" };
  const d = r.data!;
  if (d.ok && typeof d.customer_id === "number" && typeof d.email === "string" && typeof d.sid === "string") {
    return { ok: true, rotated: d.rotated === true, customerId: d.customer_id, email: d.email, sid: d.sid, refresh: typeof d.refresh === "string" ? d.refresh : undefined };
  }
  if (r.status === 503 || d.reason === "busy") return { ok: false, reason: "unavailable" };
  const reason = d.reason === "reuse" || d.reason === "device_changed" ? d.reason : "invalid";
  return { ok: false, reason };
}

/**
 * Is this device's session still alive? Asked on every signed-in request so revocation is immediate.
 * "unavailable" (WordPress down) is NOT treated as active: when in doubt, the visitor is signed out.
 */
export async function checkSession(customerId: number, sid: string): Promise<"active" | "revoked" | "unavailable"> {
  const r = await call("session-check", { customer_id: customerId, sid }, 8_000);
  if (!r?.data?.ok) return "unavailable";
  return r.data.active === true ? "active" : "revoked";
}

export interface SessionInfo {
  sid: string;
  label: string;
  ip: string;
  created: number;
  last_used: number;
}

export async function listSessions(customerId: number): Promise<SessionInfo[] | null> {
  const r = await call("session-list", { customer_id: customerId });
  return r?.data?.ok && Array.isArray(r.data.sessions) ? (r.data.sessions as SessionInfo[]) : null;
}

export async function revokeSessions(input: { refresh?: string; customerId?: number; sid?: string; exceptSid?: string; all?: boolean }): Promise<boolean> {
  const r = await call("session-revoke", { refresh: input.refresh, customer_id: input.customerId, sid: input.sid, except_sid: input.exceptSid, all: input.all });
  return r?.data?.ok === true;
}
