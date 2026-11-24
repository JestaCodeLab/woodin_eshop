import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, ACCESS_TTL, REFRESH_COOKIE, REFRESH_MAX_AGE, cookieBase, describeDevice, signAccess, verifyAccess } from "@/lib/auth-tokens";
import { refreshSession } from "@/lib/auth-wp";

/**
 * Silent sign-in renewal. The access cookie lasts 15 minutes. When it has run out but the refresh cookie is still
 * there, this swaps the refresh token for a new one (WordPress checks it, rotates it, and ends the session if it
 * looks copied), then hands the page the renewed cookies so it renders signed in. Requests that are already signed
 * in, or have no refresh cookie at all, pass straight through.
 *
 * Several requests can arrive together with the same expired cookie (a page and its prefetches). WordPress accepts
 * the previous token for a few seconds so that race does not sign anyone out.
 */
export async function proxy(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.next();

  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  if (access && verifyAccess(access)) return NextResponse.next();

  const result = await refreshSession(refreshToken, describeDevice(req.headers.get("user-agent")).key);
  // WordPress unreachable or busy: keep the cookies and try again on the next request.
  if (!result.ok && result.reason === "unavailable") return NextResponse.next();

  // What the page (rendering on the server) will see as the request's cookies.
  const jar = new Map(req.cookies.getAll().map((c) => [c.name, c.value]));
  let nextAccess: string | null = null;
  let nextRefresh: string | undefined;

  if (result.ok) {
    nextAccess = signAccess({ customerId: result.customerId, email: result.email, sid: result.sid });
    jar.set(ACCESS_COOKIE, nextAccess);
    if (result.rotated && result.refresh) {
      nextRefresh = result.refresh;
      jar.set(REFRESH_COOKIE, nextRefresh);
    }
  } else {
    // Expired, copied, or from a different browser: signed out. Clear both cookies.
    jar.delete(ACCESS_COOKIE);
    jar.delete(REFRESH_COOKIE);
  }

  const headers = new Headers(req.headers);
  headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
  const res = NextResponse.next({ request: { headers } });

  if (nextAccess) {
    res.cookies.set(ACCESS_COOKIE, nextAccess, cookieBase(ACCESS_TTL));
    if (nextRefresh) res.cookies.set(REFRESH_COOKIE, nextRefresh, cookieBase(REFRESH_MAX_AGE));
  } else {
    res.cookies.set(ACCESS_COOKIE, "", cookieBase(0));
    res.cookies.set(REFRESH_COOKIE, "", cookieBase(0));
  }
  return res;
}

export const config = {
  // Everything except static files and the signed webhooks (they carry no cookies and must stay untouched).
  matcher: ["/((?!_next/static|_next/image|brand/|images/|payments/|favicon.ico|icon|apple-icon|manifest.webmanifest|robots.txt|sitemap.xml|opengraph-image|twitter-image|api/paystack|api/woocommerce|api/revalidate).*)"],
};
