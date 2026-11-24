/**
 * Pure helpers for login tokens and cookies. NO "server-only" import and no next/headers: the proxy
 * (proxy.ts) uses this file to refresh sessions before a page renders.
 *
 * Model: a short-lived ACCESS cookie (signed, 15 min) proves who you are on each request without a database
 * call. A REFRESH cookie (random token, 30 days, hash kept in WordPress) silently gets a new access cookie when
 * it expires, and is replaced by a new token every time it is used.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const prod = process.env.NODE_ENV === "production";

// "__Host-" cookies are only accepted over HTTPS, for this exact host, with Path=/ and no Domain, so a sibling
// subdomain (the WordPress site) cannot overwrite them. They need Secure, so they are production-only.
export const ACCESS_COOKIE = prod ? "__Host-woodin_at" : "woodin_at";
export const REFRESH_COOKIE = prod ? "__Host-woodin_rt" : "woodin_rt";

/** Access cookie lifetime in seconds. AUTH_ACCESS_TTL_SECONDS exists for testing; leave it unset in production. */
export const ACCESS_TTL = Math.min(3600, Math.max(2, Number(process.env.AUTH_ACCESS_TTL_SECONDS) || 900));
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export interface AccessClaims {
  customerId: number;
  email: string;
  /** Which device/session this is (so it can be listed and revoked). */
  sid: string;
  exp: number;
}

export function sessionKey(): string | null {
  const s = process.env.SESSION_SECRET?.trim();
  return s && s.length >= 32 ? s : null;
}

const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

export function signAccess(c: Omit<AccessClaims, "exp">): string {
  const key = sessionKey();
  if (!key) throw new Error("SESSION_SECRET is not set");
  const claims: AccessClaims = { ...c, exp: Math.floor(Date.now() / 1000) + ACCESS_TTL };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function verifyAccess(token: string): AccessClaims | null {
  const key = sessionKey();
  if (!key) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const c = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AccessClaims>;
    if (!Number.isInteger(c.customerId) || (c.customerId as number) <= 0) return null;
    if (typeof c.email !== "string" || typeof c.sid !== "string" || typeof c.exp !== "number") return null;
    return c.exp * 1000 > Date.now() ? (c as AccessClaims) : null;
  } catch {
    return null;
  }
}

/** Attributes for both cookies. Browsers only delete a __Host- cookie when these match, Secure included. */
export const cookieBase = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: prod,
  path: "/",
  maxAge,
});

/**
 * Browser family + OS family from the User-Agent, deliberately coarse so a browser update does not log anyone out.
 * Honest limit: a User-Agent is trivial to copy, so this is a tripwire that catches careless token theft, not a
 * defence by itself. The real protection is the rotating refresh token and its reuse detection.
 */
export function describeDevice(ua: string | null | undefined): { key: string; label: string } {
  const s = ua ?? "";
  const os = /iPhone|iPad|iPod/.test(s) ? "iOS" : /Android/.test(s) ? "Android" : /Windows/.test(s) ? "Windows" : /Macintosh|Mac OS X/.test(s) ? "Mac" : /CrOS/.test(s) ? "ChromeOS" : /Linux|X11/.test(s) ? "Linux" : "";
  const browser = /Edg\//.test(s) ? "Edge" : /OPR\/|Opera/.test(s) ? "Opera" : /Firefox\/|FxiOS/.test(s) ? "Firefox" : /SamsungBrowser/.test(s) ? "Samsung Internet" : /Chrome\/|CriOS/.test(s) ? "Chrome" : /Safari\//.test(s) ? "Safari" : "";
  // "Request desktop site" turns Android into Linux and iPhone into Mac, so those pairs count as the same device.
  const osKey = os === "iOS" || os === "Mac" ? "apple" : os === "Android" || os === "Linux" || os === "ChromeOS" ? "linux" : os.toLowerCase();
  return { key: `${browser.toLowerCase() || "?"}|${osKey || "?"}`, label: browser && os ? `${browser} on ${os}` : browser || os || "Unknown device" };
}

/** Last part of the address hidden, so the sessions list can say roughly where without storing a full IP. */
export function maskIp(ip: string): string {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip.replace(/\.\d{1,3}$/, ".x");
  if (ip.includes(":")) return `${ip.split(":").slice(0, 3).join(":")}::x`;
  return "";
}
