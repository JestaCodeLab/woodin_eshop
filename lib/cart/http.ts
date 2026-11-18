import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { ZodType } from "zod";
import { cartBackend, CartError, type Cart, type CartBackend } from "./index";

const NO_STORE = { "Cache-Control": "no-store" };

function fail(e: unknown): Response {
  // Let Next's internal control-flow errors (e.g. the prerender interrupt thrown by cookies()) through.
  unstable_rethrow(e);
  if (e instanceof CartError && e.status < 500) {
    return Response.json({ error: e.code, message: e.message }, { status: e.status, headers: NO_STORE });
  }
  console.error("[cart]", e instanceof Error ? e.message : e);
  return Response.json(
    { error: "cart_unavailable", message: "Your bag is unavailable right now. Please try again." },
    { status: e instanceof CartError && e.status === 502 ? 502 : 500, headers: NO_STORE },
  );
}

/** GET handler body. */
export async function cartGet(): Promise<Response> {
  try {
    return Response.json(await cartBackend().get(), { headers: NO_STORE });
  } catch (e) {
    return fail(e);
  }
}

/**
 * POST handler body. Cart mutations are cookie-authenticated, so require a JSON content type
 * (a cross-site <form> cannot send one without a CORS preflight) and a same-origin Origin.
 */
export async function cartMutate<T>(
  req: Request,
  schema: ZodType<T>,
  run: (backend: CartBackend, input: T) => Promise<Cart>,
): Promise<Response> {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return Response.json({ error: "forbidden_origin" }, { status: 403, headers: NO_STORE });
  }
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "unsupported_media_type" }, { status: 415, headers: NO_STORE });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request", issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    return Response.json(await run(cartBackend(), parsed.data), { headers: NO_STORE });
  } catch (e) {
    return fail(e);
  }
}
