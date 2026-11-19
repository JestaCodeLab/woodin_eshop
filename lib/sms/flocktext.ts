import "server-only";
import type { SmsMessage, SmsResult } from "./index";

/**
 * FlockText driver (https://api.flocktext.com/api, per FlockText's API docs).
 *   POST /v1/messages/send   Authorization: Bearer flk_live_…
 *   { recipients: [{ phone: "+233…", name? }], message, sender_id? }
 *   201 { status: "success", data: { id, stats, creditCost, creditsBalance } }
 *   401 bad key | 402 not enough credits | 422 bad phone/message.   Rate limit: 100 requests / 15 min / organisation.
 *
 * Messages sent here use the same FlockText account and wallet as the FlockText WordPress plugin.
 * There is deliberately NO automatic retry: a retry after an ambiguous failure could text the customer twice.
 * An unsent text is retried naturally the next time the order is updated (it is only marked sent on success).
 */

const LOW_CREDITS = 50;

interface Envelope {
  status?: string;
  message?: string;
  data?: { id?: string; creditCost?: number; creditsBalance?: number } | null;
}

export async function sendViaFlockText(msg: SmsMessage): Promise<SmsResult> {
  const provider = "flocktext";
  const key = process.env.FLOCKTEXT_API_KEY?.trim();
  if (!key) {
    console.error("[sms] FLOCKTEXT_API_KEY is not set");
    return { ok: false, provider, detail: "FLOCKTEXT_API_KEY not set" };
  }
  const base = (process.env.FLOCKTEXT_API_URL?.trim() || "https://api.flocktext.com/api").replace(/\/+$/, "");
  const senderId = process.env.FLOCKTEXT_SENDER_ID?.trim();

  let res: Response;
  try {
    res = await fetch(`${base}/v1/messages/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        recipients: [{ phone: msg.to, ...(msg.name ? { name: msg.name } : null) }],
        message: msg.text,
        // Omitted = the organisation's primary approved sender ID.
        ...(senderId ? { sender_id: senderId } : null),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, provider, detail: "could not reach FlockText" };
  }

  const body = (await res.json().catch(() => null)) as Envelope | null;
  if (res.ok && body?.status === "success") {
    const balance = body.data?.creditsBalance;
    if (typeof balance === "number" && balance < LOW_CREDITS) {
      console.warn(`[sms] FlockText credit balance is low: ${balance} remaining`);
    }
    return { ok: true, provider, detail: `id ${body.data?.id ?? "?"}, balance ${balance ?? "?"}` };
  }

  const why =
    res.status === 401 ? "invalid or missing API key" :
    res.status === 402 ? "NOT ENOUGH SMS CREDITS: top up the FlockText wallet" :
    res.status === 422 ? "FlockText rejected the message or phone number" :
    res.status === 429 ? "FlockText rate limit reached (100 requests / 15 minutes)" :
    `HTTP ${res.status}`;
  return { ok: false, provider, detail: `${why}${body?.message ? ` (${body.message})` : ""}` };
}
