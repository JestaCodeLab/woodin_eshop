import "server-only";

/**
 * True when the request's Origin (if present) matches this site's Host. A missing Origin is allowed
 * (same-origin GETs and non-browser clients); callers also require a JSON content type, which a
 * cross-site <form> cannot send. A malformed Origin, including the literal "null" that sandboxed
 * iframes send, is rejected instead of throwing.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
