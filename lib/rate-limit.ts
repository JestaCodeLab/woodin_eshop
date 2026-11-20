import "server-only";

/**
 * Fixed-window rate limiter, kept in memory.
 *
 * LIMITATION: state is per server instance. On serverless each instance counts on its own, so this
 * slows a single abusive client but does not give a hard global cap. For a hard cap, add Vercel's
 * Firewall rate-limit rules or swap `hit()` for a shared store (e.g. Upstash Redis) - every caller
 * goes through `rateLimit()`, so that is the only function to change.
 */

interface Bucket {
  n: number;
  reset: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function sweep(now: number) {
  for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
  // Still huge (a flood of distinct keys): drop everything rather than grow without bound.
  if (buckets.size > MAX_BUCKETS) buckets.clear();
}

/**
 * Best-effort client IP. Vercel sets x-vercel-forwarded-for / x-real-ip itself (a client cannot
 * forge them there). The last x-forwarded-for entry is the one added by the nearest proxy, so it is
 * preferred over the first, which the client controls.
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  const vercel = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return xff?.[xff.length - 1] ?? "unknown";
}

/** Returns true when this request is OVER the limit. `scope` keeps routes' counters separate. */
export function rateLimit(req: Request, scope: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS / 2) sweep(now);
  const key = `${scope}:${clientIp(req)}`;
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  return ++b.n > max;
}
