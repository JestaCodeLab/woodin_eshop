import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { ACCESS_COOKIE, ACCESS_TTL, REFRESH_COOKIE, REFRESH_MAX_AGE, cookieBase, describeDevice, maskIp, sessionKey, signAccess, verifyAccess } from "./auth-tokens";
import { checkSession, createSession, loginSecretConfigured, revokeSessions } from "./auth-wp";
import { ordersConfigured } from "./payments-config";
import { clientIp } from "./rate-limit";
import { turnstileConfigured } from "./turnstile";

/**
 * Customer sessions (see lib/auth-tokens.ts for the model).
 *
 * - Sign-in = a 6-digit emailed code (generated, hashed and rate-limited by the WordPress plugin) plus a Turnstile
 *   check. Registering and signing in are separate: a code is only emailed to a registering address or to an
 *   existing customer.
 * - After the code, the browser gets a 15-minute ACCESS cookie and a rotating REFRESH cookie. The proxy
 *   (proxy.ts) renews the access cookie before pages render; WordPress keeps a hash of the refresh token and can
 *   revoke it, so "sign out" and "sign out everywhere" really end sessions.
 */

export interface Session {
  /** WooCommerce customer id. */
  customerId: number;
  email: string;
  /** This device's session id. */
  sid: string;
}

/** Accounts need the session secret, the WordPress login plugin + orders site and, in production, Turnstile. */
export function accountsEnabled(): boolean {
  return sessionKey() !== null && loginSecretConfigured() && ordersConfigured() && (turnstileConfigured() || process.env.NODE_ENV !== "production");
}

// One live check per request, however many components ask who is signed in.
const liveCheck = cache((customerId: number, sid: string) => checkSession(customerId, sid));

/**
 * The signed-in customer, or null. Reads cookies, so call it behind <Suspense> or in a route handler.
 *
 * Two things must both hold: the signed access cookie is genuine and unexpired, AND WordPress says that device's
 * session is still alive. The second check is what makes sign-out immediate: a copied cookie, or a device signed
 * out from another device, stops working on its next request. If WordPress cannot be reached the answer is "not
 * signed in" (fail closed).
 */
export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!raw) return null;
  // Checking expiry compares against the current time. Next refuses unstable values while it prerenders or
  // prefetches a page, so wait until a real request is being served.
  await connection();
  const c = verifyAccess(raw);
  if (!c) return null;
  if ((await liveCheck(c.customerId, c.sid)) !== "active") return null;
  return { customerId: c.customerId, email: c.email, sid: c.sid };
}

/** Creates the session in WordPress and sets both cookies. `welcome` (a brand-new account) also sends the welcome email. Returns false when WordPress could not. */
export async function startSession(req: Request, customerId: number, email: string, opts: { welcome?: boolean } = {}): Promise<boolean> {
  const device = describeDevice(req.headers.get("user-agent"));
  const created = await createSession({ customerId, uaKey: device.key, uaLabel: device.label, ip: maskIp(clientIp(req)), welcome: opts.welcome });
  if (!created) return false;
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, signAccess({ customerId, email, sid: created.sid }), cookieBase(ACCESS_TTL));
  jar.set(REFRESH_COOKIE, created.refresh, cookieBase(REFRESH_MAX_AGE));
  return true;
}

/** Ends this device's session in WordPress (best effort) and clears both cookies. */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  const access = jar.get(ACCESS_COOKIE)?.value;
  const claims = access ? verifyAccess(access) : null;
  // Revoke on the server FIRST, using whichever cookie we have, so a copy of either one is dead from this moment.
  if (refresh) await revokeSessions({ refresh }).catch(() => false);
  else if (claims) await revokeSessions({ customerId: claims.customerId, sid: claims.sid }).catch(() => false);
  clearSessionCookies(jar);
}

/**
 * Expires both cookies with the SAME attributes they were set with. A "__Host-" cookie is only accepted (and only
 * deleted) by browsers when the response carries Secure and Path=/, which a plain delete() omits.
 */
export function clearSessionCookies(jar: Awaited<ReturnType<typeof cookies>>): void {
  jar.set(ACCESS_COOKIE, "", cookieBase(0));
  jar.set(REFRESH_COOKIE, "", cookieBase(0));
}
