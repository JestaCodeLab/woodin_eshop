import "server-only";
import { requestPhoneCode, verifyPhoneCode } from "./auth-wp";
import { customerNames, getCustomer, phoneState, setPhoneVerified } from "./customers";
import { sendSms } from "./sms";
import { smsText } from "./sms/messages";

/**
 * Proves a customer owns the phone number on their account, by texting a 6-digit code.
 * The number is ALWAYS read from the customer's own record, never from the request, so nobody can use this to
 * text an arbitrary number. WordPress makes/stores/checks the code and enforces the send limits (each text costs
 * SMS credit); this file sends the text and records the result.
 */

export type PhoneResult = { ok: true; already?: boolean } | { ok: false; status: number; message: string };

export async function startPhoneVerification(customerId: number, ip: string): Promise<PhoneResult> {
  const c = await getCustomer(customerId).catch(() => null);
  if (!c) return { ok: false, status: 502, message: "We could not load your account right now. Please try again." };
  const p = phoneState(c);
  if (!p.e164) return { ok: false, status: 400, message: "Add a Ghana mobile number in Account details first." };
  if (p.verified) return { ok: true, already: true };

  const made = await requestPhoneCode(customerId, p.e164, ip);
  if (!made.ok) {
    if (made.reason === "rate_limited") return { ok: false, status: 429, message: "Too many codes requested. Please wait a few minutes and try again." };
    return { ok: false, status: 502, message: "We could not send your code right now. Please try again." };
  }

  const sent = await sendSms({ to: p.e164, text: smsText({ type: "verify", code: made.code }), name: customerNames(c).first || undefined });
  if (!sent.ok) {
    console.error(`[phone-verify] SMS not sent: ${sent.detail ?? "unknown"}`);
    return { ok: false, status: 502, message: "We could not send the text message. Please check the number and try again." };
  }
  return { ok: true };
}

const MESSAGES = {
  wrong: "That code is not right. Check it and try again.",
  expired: "That code has expired. Ask for a new one.",
  locked: "Too many wrong tries. Ask for a new code.",
  invalid: "Enter the 6-digit code from the text message.",
} as const;

export async function confirmPhoneVerification(customerId: number, code: string): Promise<PhoneResult> {
  const c = await getCustomer(customerId).catch(() => null);
  if (!c) return { ok: false, status: 502, message: "We could not load your account right now. Please try again." };
  const p = phoneState(c);
  if (!p.e164) return { ok: false, status: 400, message: "Add a Ghana mobile number in Account details first." };
  if (p.verified) return { ok: true, already: true };

  const r = await verifyPhoneCode(customerId, p.e164, code);
  if (!r.ok) {
    if (r.reason === "unavailable") return { ok: false, status: 502, message: "We could not check your code right now. Please try again." };
    return { ok: false, status: 401, message: MESSAGES[r.reason] };
  }
  await setPhoneVerified(customerId, p.e164);
  return { ok: true };
}
