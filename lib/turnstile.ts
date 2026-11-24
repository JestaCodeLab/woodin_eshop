import "server-only";

/**
 * Cloudflare Turnstile: proves a human (not a script) submitted the sign-in/register form, before we spend an
 * email on it. The widget in the browser produces a one-time token; this checks it with Cloudflare.
 */

const VERIFY_URL = process.env.TURNSTILE_VERIFY_URL?.trim() || "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const turnstileSiteKey = () => process.env.CLOUDFLARE_TURNSTILE_SITE_KEY?.trim() || null;
const secret = () => process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY?.trim() || null;

/** Production must have Turnstile configured; locally it may be absent so development is not blocked. */
export const turnstileConfigured = () => secret() !== null && turnstileSiteKey() !== null;
export const turnstileRequired = () => process.env.NODE_ENV === "production" || turnstileConfigured();

export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  if (!turnstileRequired()) return true;
  const key = secret();
  if (!key) return false; // production without a secret fails closed
  if (typeof token !== "string" || token.length < 10 || token.length > 4096) return false;
  try {
    const body = new URLSearchParams({ secret: key, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(8_000) });
    const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
    return data?.success === true;
  } catch (e) {
    console.error("[turnstile] verification failed:", e instanceof Error ? e.message : e);
    return false;
  }
}
