import "server-only";

import { sendViaFlockText } from "./flocktext";

/**
 * SMS sending, provider-agnostic. Pick the provider with SMS_PROVIDER:
 *   "log"        (default) prints what WOULD be sent. Nothing leaves the server.
 *   "flocktext"  real sending through the FlockText API (lib/sms/flocktext.ts).
 * Only transactional messages to the customer who placed the order are sent.
 */

export interface SmsMessage {
  /** E.164, e.g. +233241234567 */
  to: string;
  text: string;
  /** Recipient's first name (optional, shown in FlockText's delivery history). */
  name?: string;
}

export interface SmsResult {
  ok: boolean;
  provider: string;
  detail?: string;
}

const mask = (n: string) => `${n.slice(0, 4)}•••••${n.slice(-3)}`;
/** GSM-7 text is 160 chars per SMS (153 when concatenated); anything else drops to 70 (67). */
const segments = (t: string) => (/^[\x20-\x7E\n]*$/.test(t) ? Math.ceil(t.length / (t.length <= 160 ? 160 : 153)) : Math.ceil(t.length / (t.length <= 70 ? 70 : 67)));

export function smsProvider(): "log" | "flocktext" {
  return process.env.SMS_PROVIDER === "flocktext" ? "flocktext" : "log";
}

/** Ghana numbers to E.164. Returns null when it cannot be a Ghana mobile number. */
export function toE164(phone: string | undefined): string | null {
  const d = (phone ?? "").replace(/[^\d+]/g, "");
  const m = /^(?:\+?233|0)(\d{9})$/.exec(d);
  return m ? `+233${m[1]}` : null;
}

export async function sendSms(msg: SmsMessage): Promise<SmsResult> {
  const provider = smsProvider();

  if (provider === "flocktext") return sendViaFlockText(msg);

  console.log(`[sms:log] would send to ${mask(msg.to)} (${segments(msg.text)} segment${segments(msg.text) === 1 ? "" : "s"}): ${msg.text}`);
  return { ok: true, provider };
}
