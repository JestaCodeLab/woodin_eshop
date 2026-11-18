import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { paystackApiUrl, paystackSecret } from "./payments-config";

/**
 * Minimal Paystack client (server only). The secret key never leaves the server.
 * Amounts are in the currency's minor unit: GHS pesewas (GH₵ 12.50 = 1250).
 */

export class PaystackError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PaystackError";
  }
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const key = paystackSecret();
  if (!key) throw new PaystackError(500, "PAYSTACK_SECRET_KEY is not set");

  let res: Response;
  try {
    res = await fetch(`${paystackApiUrl()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new PaystackError(502, "Could not reach Paystack");
  }
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !json?.status) throw new PaystackError(res.status || 502, json?.message ?? "Paystack rejected the request");
  return json.data as T;
}

export interface InitializedTransaction {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export function initializeTransaction(input: {
  email: string;
  /** Minor units (pesewas). */
  amount: number;
  reference: string;
  callbackUrl: string;
  channels: string[];
  metadata: Record<string, unknown>;
}): Promise<InitializedTransaction> {
  return call<InitializedTransaction>("POST", "/transaction/initialize", {
    email: input.email,
    amount: input.amount,
    currency: "GHS",
    reference: input.reference,
    callback_url: input.callbackUrl,
    channels: input.channels,
    metadata: input.metadata,
  });
}

export interface VerifiedTransaction {
  id: number;
  status: string; // "success" | "failed" | "abandoned" | "ongoing" | "pending" | "queued" …
  reference: string;
  amount: number;
  currency: string;
}

export function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  return call<VerifiedTransaction>("GET", `/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Paystack signs the raw webhook body with HMAC-SHA512 using the secret key (x-paystack-signature). */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = paystackSecret();
  if (!key || !signature) return false;
  const expected = createHmac("sha512", key).update(rawBody).digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}
